import { db, getPricingForModel, isoNow } from "./db.js";
import type { AggregateUsageRow, JsonRecord, RecordUsageInput, UsageCounts } from "./types.js";

const numberFrom = (...values: unknown[]) => {
  for (const value of values) {
    if (Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
};

const getNestedUsage = (payload: JsonRecord | null | undefined): JsonRecord => (
  payload?.usageMetadata || payload?.usage_metadata || payload?.metadata || {}
);

export function extractUsage(bodyText: string): UsageCounts {
  const base: UsageCounts = {
    cachedContentTokenCount: 0,
    promptTokenCount: 0,
    thoughtsTokenCount: 0,
    candidatesTokenCount: 0,
    billableCharacterCount: 0,
  };

  const apply = (payload: JsonRecord) => {
    const usage = getNestedUsage(payload);
    base.cachedContentTokenCount = Math.max(base.cachedContentTokenCount, numberFrom(
      usage.cachedContentTokenCount,
      usage.cached_content_token_count,
    ));
    base.promptTokenCount = Math.max(base.promptTokenCount, numberFrom(
      usage.promptTokenCount,
      usage.prompt_token_count,
    ));
    base.thoughtsTokenCount = Math.max(base.thoughtsTokenCount, numberFrom(
      usage.thoughtsTokenCount,
      usage.thoughts_token_count,
    ));
    base.candidatesTokenCount = Math.max(base.candidatesTokenCount, numberFrom(
      usage.candidatesTokenCount,
      usage.candidates_token_count,
    ));
    base.billableCharacterCount = Math.max(base.billableCharacterCount, numberFrom(
      usage.billableCharacterCount,
      usage.billable_character_count,
      payload?.metadata?.billableCharacterCount,
      payload?.metadata?.billable_character_count,
    ));
  };

  if (!bodyText) return base;

  try {
    apply(JSON.parse(bodyText));
    return base;
  } catch {
    // Streaming responses may be Server-Sent Events; each data line can carry a JSON chunk.
  }

  for (const line of bodyText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      apply(JSON.parse(data));
    } catch {
      // Keep pass-through behavior even if one upstream chunk is not JSON.
    }
  }

  return base;
}

export function extractModelFromPath(pathname: string) {
  const patterns = [
    /\/publishers\/google\/models\/([^/:]+):/i,
    /\/models\/([^/:]+):/i,
  ];

  for (const pattern of patterns) {
    const match = pathname.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return "";
}

export function isEmbeddingModel(modelId: string) {
  return /embedding/i.test(modelId || "");
}

export function normalizeUsageForModel(modelId: string, usage: UsageCounts): UsageCounts {
  if (!isEmbeddingModel(modelId)) return usage;

  const embeddingUsage = Number(usage.billableCharacterCount || 0)
    || Number(usage.promptTokenCount || 0)
    + Number(usage.thoughtsTokenCount || 0)
    + Number(usage.candidatesTokenCount || 0);

  return {
    ...usage,
    cachedContentTokenCount: 0,
    promptTokenCount: 0,
    thoughtsTokenCount: 0,
    candidatesTokenCount: 0,
    billableCharacterCount: embeddingUsage,
  };
}

export function hasNonZeroPrice(modelId: string) {
  const pricing = getPricingForModel(modelId);
  if (!pricing) return false;
  return [
    pricing.input_price,
    pricing.output_price,
    pricing.cache_price,
    pricing.embedding_input_price,
  ].some((value) => Number(value) > 0);
}

export function calculateCost(modelId: string, usage: UsageCounts) {
  const pricing = getPricingForModel(modelId);
  if (!pricing) return 0;

  const normalizedUsage = normalizeUsageForModel(modelId, usage);
  const inputTokens = Math.max(normalizedUsage.promptTokenCount - normalizedUsage.cachedContentTokenCount, 0);
  const outputTokens = normalizedUsage.thoughtsTokenCount + normalizedUsage.candidatesTokenCount;

  const tokenCost = (inputTokens / 1_000_000) * Number(pricing.input_price || 0)
    + (outputTokens / 1_000_000) * Number(pricing.output_price || 0)
    + (normalizedUsage.cachedContentTokenCount / 1_000_000) * Number(pricing.cache_price || 0);
  const embeddingCost = (normalizedUsage.billableCharacterCount / 1_000_000)
    * Number(pricing.embedding_input_price || 0);

  if (isEmbeddingModel(modelId) || normalizedUsage.billableCharacterCount > 0) {
    return Number(embeddingCost.toFixed(8));
  }

  return Number((tokenCost + embeddingCost).toFixed(8));
}

export function recordUsage({
  userId,
  apiKeyId,
  modelId,
  endpoint,
  requestPath,
  statusCode,
  usage,
  cost,
  auditFile,
}: RecordUsageInput) {
  const ts = isoNow();
  db.transaction(() => {
    db.prepare(`
      INSERT INTO usage_records (
        user_id,
        api_key_id,
        model_id,
        endpoint,
        request_path,
        usage_date,
        status_code,
        cached_content_token_count,
        prompt_token_count,
        thoughts_token_count,
        candidates_token_count,
        billable_character_count,
        cost,
        audit_file,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      apiKeyId,
      modelId,
      endpoint,
      requestPath,
      ts.slice(0, 10),
      statusCode,
      usage.cachedContentTokenCount,
      usage.promptTokenCount,
      usage.thoughtsTokenCount,
      usage.candidatesTokenCount,
      usage.billableCharacterCount,
      cost,
      auditFile,
      ts,
    );

    if (cost > 0) {
      db.prepare("UPDATE users SET balance = balance - ?, updated_at = ? WHERE id = ?")
        .run(cost, ts, userId);
    }
  })();
}

const aggregateUsageColumns = `
  COUNT(*) AS requestCount,
  SUM(CASE WHEN u.status_code >= 200 AND u.status_code < 300 THEN 1 ELSE 0 END) AS successCount,
  SUM(u.cached_content_token_count) AS cachedContentTokenCount,
  SUM(u.prompt_token_count) AS promptTokenCount,
  SUM(u.thoughts_token_count) AS thoughtsTokenCount,
  SUM(u.candidates_token_count) AS candidatesTokenCount,
  SUM(u.billable_character_count) AS billableCharacterCount,
  SUM(u.cost) AS cost,
  SUM((u.cached_content_token_count / 1000000.0) * COALESCE(p.cache_price, 0)) AS cachedCost,
  SUM((
    CASE
      WHEN u.prompt_token_count > u.cached_content_token_count
        THEN u.prompt_token_count - u.cached_content_token_count
      ELSE 0
    END / 1000000.0
  ) * COALESCE(p.input_price, 0)) AS uncachedCost,
  SUM(((u.thoughts_token_count + u.candidates_token_count) / 1000000.0) * COALESCE(p.output_price, 0)) AS outputCost,
  SUM((u.billable_character_count / 1000000.0) * COALESCE(p.embedding_input_price, 0)) AS embeddingCost
`;

export function userDailyStats(userId: number): AggregateUsageRow[] {
  return db.prepare(`
    SELECT
      usage_date AS date,
      ${aggregateUsageColumns}
    FROM usage_records u
    LEFT JOIN pricing p ON p.model_id = u.model_id
    WHERE u.user_id = ?
    GROUP BY u.usage_date
    ORDER BY u.usage_date DESC
    LIMIT 30
  `).all(userId) as AggregateUsageRow[];
}

export function userDailyModelStats(userId: number): AggregateUsageRow[] {
  return db.prepare(`
    WITH recent_dates AS (
      SELECT DISTINCT usage_date
      FROM usage_records
      WHERE user_id = ?
      ORDER BY usage_date DESC
      LIMIT 30
    )
    SELECT
      u.usage_date AS date,
      COALESCE(NULLIF(u.model_id, ''), 'unknown') AS modelId,
      ${aggregateUsageColumns}
    FROM usage_records u
    INNER JOIN recent_dates rd ON rd.usage_date = u.usage_date
    LEFT JOIN pricing p ON p.model_id = u.model_id
    WHERE u.user_id = ?
    GROUP BY u.usage_date, COALESCE(NULLIF(u.model_id, ''), 'unknown')
    ORDER BY u.usage_date DESC, SUM(u.cost) DESC, modelId ASC
  `).all(userId, userId) as AggregateUsageRow[];
}

export function recentUsage(userId: number, limit = 20) {
  return db.prepare(`
    SELECT *
    FROM usage_records
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit);
}

export function userModelStats(userId: number): AggregateUsageRow[] {
  return db.prepare(`
    SELECT
      COALESCE(NULLIF(u.model_id, ''), 'unknown') AS modelId,
      ${aggregateUsageColumns}
    FROM usage_records u
    LEFT JOIN pricing p ON p.model_id = u.model_id
    WHERE u.user_id = ?
    GROUP BY COALESCE(NULLIF(u.model_id, ''), 'unknown')
    ORDER BY SUM(u.cost) DESC, COUNT(*) DESC, modelId ASC
  `).all(userId) as AggregateUsageRow[];
}

export function adminDailyStats(): AggregateUsageRow[] {
  return db.prepare(`
    SELECT
      usage_date AS date,
      ${aggregateUsageColumns}
    FROM usage_records u
    LEFT JOIN pricing p ON p.model_id = u.model_id
    GROUP BY u.usage_date
    ORDER BY u.usage_date DESC
    LIMIT 30
  `).all() as AggregateUsageRow[];
}

export function adminDailyModelStats(): AggregateUsageRow[] {
  return db.prepare(`
    WITH recent_dates AS (
      SELECT DISTINCT usage_date
      FROM usage_records
      ORDER BY usage_date DESC
      LIMIT 30
    )
    SELECT
      u.usage_date AS date,
      COALESCE(NULLIF(u.model_id, ''), 'unknown') AS modelId,
      ${aggregateUsageColumns}
    FROM usage_records u
    INNER JOIN recent_dates rd ON rd.usage_date = u.usage_date
    LEFT JOIN pricing p ON p.model_id = u.model_id
    GROUP BY u.usage_date, COALESCE(NULLIF(u.model_id, ''), 'unknown')
    ORDER BY u.usage_date DESC, SUM(u.cost) DESC, modelId ASC
  `).all() as AggregateUsageRow[];
}

export function adminModelStats(): AggregateUsageRow[] {
  return db.prepare(`
    SELECT
      COALESCE(NULLIF(u.model_id, ''), 'unknown') AS modelId,
      ${aggregateUsageColumns}
    FROM usage_records u
    LEFT JOIN pricing p ON p.model_id = u.model_id
    GROUP BY COALESCE(NULLIF(u.model_id, ''), 'unknown')
    ORDER BY SUM(u.cost) DESC, COUNT(*) DESC, modelId ASC
  `).all() as AggregateUsageRow[];
}
