import express from "express";
import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { REQUEST_LOG_DIR, getProviderConfig, isoNow } from "./db.js";
import { findApiKey, touchApiKey } from "./auth.js";
import {
  calculateCost,
  extractModelFromPath,
  extractUsage,
  hasNonZeroPrice,
  normalizeUsageForModel,
  recordUsage,
} from "./billing.js";
import { getVertexAccessToken, parseVertexCredentials } from "./googleProvider.js";
import type { ApiKeyRow, HttpError, JsonRecord, ProviderConfig, UsageCounts } from "./types.js";

const rawJson = express.raw({ type: "*/*", limit: "50mb" });

type HeaderMap = Record<string, string>;
type VertexEmbeddingApiType = "predict" | "embedContent";

interface UpstreamRequest {
  url: string;
  headers: HeaderMap;
  vertexEmbeddingBatchCompat?: boolean;
  vertexEmbeddingApiType?: VertexEmbeddingApiType;
  modelId?: string;
}

interface AuditLogInput {
  req: Request;
  fileName: string;
  apiKeyRow: ApiKeyRow;
  provider: ProviderConfig | null;
  upstreamUrl: string;
  responseBody: string;
  statusCode: number;
  usage: UsageCounts;
  cost: number;
  error?: unknown;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function stripApiPrefix(pathname: string) {
  return pathname.replace(/^\/api\/(v1(?:alpha|beta1?)?\/)/, "/$1");
}

function vertexEmbeddingApiTypeForModel(modelId: string): VertexEmbeddingApiType {
  const normalized = modelId.toLowerCase();
  if ((normalized.includes("gemini") && normalized !== "gemini-embedding-001") || normalized.includes("maas")) {
    return "embedContent";
  }
  return "predict";
}

export function toVertexPathname(pathname: string, projectId: string, location: string) {
  let vertexPathname = pathname.replace(/^\/v1beta\//, "/v1beta1/");

  if (!vertexPathname.includes("/projects/") && /^\/v1(?:alpha|beta1?)?\/models\//.test(vertexPathname)) {
    vertexPathname = vertexPathname.replace(
      /^\/(v1(?:alpha|beta1?)?)\/models\//,
      `/$1/projects/${projectId}/locations/${location}/publishers/google/models/`,
    );
  }

  vertexPathname = vertexPathname.replace(
    /(\/publishers\/google\/models\/[^/:]*embedding[^/:]*):batchEmbedContents$/i,
    (_match, modelPath: string) => {
      const modelId = decodeURIComponent(modelPath.split("/").pop() || "");
      return `${modelPath}:${vertexEmbeddingApiTypeForModel(modelId)}`;
    },
  );

  return vertexPathname;
}

function isVertexEmbeddingBatchCompat(pathname: string) {
  return /\/(?:publishers\/google\/)?models\/[^/:]*embedding[^/:]*:batchEmbedContents$/i.test(pathname);
}

function makeHttpError(message: string, status = 400) {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
}

function extractTextFromEmbeddingContent(content: unknown) {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object") return "";

  const parts = (content as JsonRecord).parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => (part && typeof part === "object" ? (part as JsonRecord).text : ""))
    .filter((text): text is string => typeof text === "string")
    .join("");
}

function setSharedEmbeddingParameter(parameters: JsonRecord, key: string, value: unknown) {
  if (value === undefined) return;
  if (parameters[key] !== undefined && JSON.stringify(parameters[key]) !== JSON.stringify(value)) {
    throw makeHttpError(`Vertex AI embedding predict requires a shared ${key} value for batched requests`);
  }
  parameters[key] = value;
}

function transformVertexEmbeddingBatchPredictRequest(payload: JsonRecord, batchRequests: unknown[], modelId: string) {
  if (/^gemini-embedding-001$/i.test(modelId) && batchRequests.length !== 1) {
    throw makeHttpError("Vertex AI gemini-embedding-001 supports one embedding content per request");
  }

  const parameters: JsonRecord = {};
  const instances = batchRequests.map((item) => {
    const request = item && typeof item === "object" ? item as JsonRecord : {};
    const content = extractTextFromEmbeddingContent(request.content || payload.content);
    if (!content) throw makeHttpError("Embedding content is required");

    const instance: JsonRecord = { content };
    const taskType = request.taskType ?? request.task_type ?? payload.taskType ?? payload.task_type;
    if (taskType !== undefined) instance.task_type = taskType;
    const title = request.title ?? payload.title;
    if (title !== undefined) instance.title = title;
    const mimeType = request.mimeType ?? request.mime_type ?? payload.mimeType ?? payload.mime_type;
    if (mimeType !== undefined) instance.mimeType = mimeType;

    setSharedEmbeddingParameter(parameters, "outputDimensionality", request.outputDimensionality ?? payload.outputDimensionality);
    setSharedEmbeddingParameter(parameters, "autoTruncate", request.autoTruncate ?? payload.autoTruncate);

    return instance;
  });

  const body: JsonRecord = { instances };
  if (Object.keys(parameters).length > 0) body.parameters = parameters;
  return body;
}

function transformVertexEmbeddingBatchEmbedContentRequest(payload: JsonRecord, batchRequests: unknown[], modelId: string) {
  if (batchRequests.length !== 1) {
    throw makeHttpError(`Vertex AI ${modelId || "embedding"} embedContent supports one embedding content per request`);
  }

  const request = batchRequests[0] && typeof batchRequests[0] === "object" ? batchRequests[0] as JsonRecord : {};
  const content = request.content || payload.content;
  if (!content) throw makeHttpError("Embedding content is required");

  const body: JsonRecord = { content };
  const embedContentConfig: JsonRecord = {};
  for (const key of ["taskType", "title", "outputDimensionality", "autoTruncate", "documentOcr", "audioTrackExtraction"]) {
    const value = request[key] ?? payload[key];
    if (value !== undefined) embedContentConfig[key] = value;
  }
  if (Object.keys(embedContentConfig).length > 0) body.embedContentConfig = embedContentConfig;
  return body;
}

export function transformVertexEmbeddingBatchRequest(
  bodyText: string,
  modelId = "",
  apiType: VertexEmbeddingApiType = vertexEmbeddingApiTypeForModel(modelId),
) {
  const payload = JSON.parse(bodyText || "{}") as JsonRecord;
  const requests = Array.isArray(payload.requests) ? payload.requests : null;
  const batchRequests = requests || [payload];

  if (batchRequests.length === 0) {
    throw makeHttpError("Embedding content is required");
  }

  const body = apiType === "embedContent"
    ? transformVertexEmbeddingBatchEmbedContentRequest(payload, batchRequests, modelId)
    : transformVertexEmbeddingBatchPredictRequest(payload, batchRequests, modelId);
  return JSON.stringify(body);
}

export function transformVertexEmbeddingBatchResponse(bodyText: string) {
  const payload = JSON.parse(bodyText || "{}") as JsonRecord;
  if (Array.isArray(payload.predictions)) {
    const embeddings = payload.predictions
      .map((prediction) => (prediction && typeof prediction === "object" ? (prediction as JsonRecord).embeddings : null))
      .filter(Boolean);
    if (embeddings.length > 0) {
      const promptTokenCount = embeddings.reduce((total, embedding) => {
        const statistics = embedding && typeof embedding === "object" ? (embedding as JsonRecord).statistics : null;
        return total + Number((statistics as JsonRecord | null)?.token_count || (statistics as JsonRecord | null)?.tokenCount || 0);
      }, 0);
      const response: JsonRecord = { embeddings };
      if (promptTokenCount > 0) response.usageMetadata = { promptTokenCount };
      return JSON.stringify(response);
    }
  }

  if (!payload.embedding || payload.embeddings) return bodyText;

  const embedding = { ...payload.embedding };
  if (payload.usageMetadata?.promptTokenCount) {
    embedding.statistics = {
      ...(embedding.statistics || {}),
      tokenCount: payload.usageMetadata.promptTokenCount,
    };
  }

  return JSON.stringify({
    embeddings: [embedding],
    usageMetadata: payload.usageMetadata,
    metadata: payload.metadata,
  });
}

function extractRelayApiKey(req: Request) {
  const auth = req.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();

  return req.get("x-api-key")
    || req.get("x-goog-api-key")
    || new URL(req.originalUrl, "http://relay.local").searchParams.get("key")
    || "";
}

function safeLogFileName(userId: number) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `${stamp}-user-${userId}-${crypto.randomBytes(4).toString("hex")}.json`;
}

function responseHeaders(headers: Headers) {
  const picked: HeaderMap = {};
  for (const key of ["content-type", "cache-control", "x-request-id"]) {
    const value = headers.get(key);
    if (value) picked[key] = value;
  }
  return picked;
}

function clientHeaders(req: Request) {
  const headers: HeaderMap = {};
  for (const [key, value] of Object.entries(req.headers)) {
    const normalized = key.toLowerCase();
    if ([
      "host",
      "connection",
      "content-length",
      "authorization",
      "cookie",
      "x-api-key",
      "x-goog-api-key",
    ].includes(normalized)) continue;
    if (Array.isArray(value)) headers[key] = value.join(", ");
    else if (typeof value === "string") headers[key] = value;
  }
  return headers;
}

function auditHeaders(req: Request) {
  const headers = { ...req.headers };
  for (const key of ["authorization", "cookie", "x-api-key", "x-goog-api-key"]) {
    if (headers[key]) headers[key] = "[redacted]";
  }
  return headers;
}

function buildUpstreamRequest(req: Request, provider: ProviderConfig): UpstreamRequest {
  const incomingUrl = new URL(req.originalUrl, "http://relay.local");
  incomingUrl.pathname = stripApiPrefix(incomingUrl.pathname);
  incomingUrl.searchParams.delete("key");
  incomingUrl.searchParams.delete("api_key");

  if (provider.mode === "ai_studio") {
    incomingUrl.searchParams.set("key", provider.key);
    return {
      url: `https://generativelanguage.googleapis.com${incomingUrl.pathname}${incomingUrl.search}`,
      headers: clientHeaders(req),
    };
  }

  const credentials = parseVertexCredentials(provider.key);
  const projectId = credentials.project_id;
  const location = provider.location || "global";
  const vertexEmbeddingBatchCompat = isVertexEmbeddingBatchCompat(incomingUrl.pathname);
  const modelId = extractModelFromPath(incomingUrl.pathname);
  const vertexEmbeddingApiType = vertexEmbeddingBatchCompat ? vertexEmbeddingApiTypeForModel(modelId) : undefined;
  const pathname = toVertexPathname(incomingUrl.pathname, projectId, location);

  const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
  return {
    url: `https://${host}${pathname}${incomingUrl.search}`,
    headers: clientHeaders(req),
    vertexEmbeddingBatchCompat,
    vertexEmbeddingApiType,
    modelId,
  };
}

async function saveAuditLog({
  req,
  fileName,
  apiKeyRow,
  provider,
  upstreamUrl,
  responseBody,
  statusCode,
  usage,
  cost,
  error,
}: AuditLogInput) {
  const payload = {
    timestamp: isoNow(),
    userId: apiKeyRow.user_id,
    apiKeyId: apiKeyRow.id,
    provider: {
      mode: provider?.mode,
      location: provider?.location,
      projectId: provider?.projectId,
    },
    upstreamUrl: upstreamUrl ? upstreamUrl.replace(/key=[^&]+/g, "key=[redacted]") : null,
    request: {
      method: req.method,
      path: req.originalUrl,
      headers: auditHeaders(req),
      body: Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "",
    },
    response: {
      statusCode,
      body: responseBody,
      error: error ? errorMessage(error) : null,
    },
    billing: {
      usage,
      cost,
    },
  };

  const absolutePath = path.join(REQUEST_LOG_DIR, fileName);
  await fs.writeFile(absolutePath, JSON.stringify(payload, null, 2), "utf8");
  return absolutePath;
}

export const proxyMiddlewares = [
  rawJson,
  async function geminiProxy(req: Request, res: Response, _next: NextFunction) {
    const relayApiKey = extractRelayApiKey(req);
    const apiKeyRow = findApiKey(relayApiKey);
    if (!apiKeyRow) return res.status(401).json({ error: "Invalid relay API key" });

    const provider = getProviderConfig({ includeSecret: true });
    if (!provider?.key) return res.status(503).json({ error: "Upstream provider is not configured" });

    const modelId = extractModelFromPath(stripApiPrefix(new URL(req.originalUrl, "http://relay.local").pathname));
    if (apiKeyRow.balance <= 0 && hasNonZeroPrice(modelId)) {
      return res.status(402).json({ error: "Insufficient balance" });
    }

    const fileName = safeLogFileName(apiKeyRow.user_id);
    let upstreamUrl = "";
    let responseBody = "";
    let statusCode = 502;
    let usage = extractUsage("");
    let cost = 0;

    try {
      const upstream = buildUpstreamRequest(req, provider);
      upstreamUrl = upstream.url;

      if (provider.mode === "vertex") {
        upstream.headers.authorization = `Bearer ${await getVertexAccessToken(provider)}`;
      }

      let body: any = ["GET", "HEAD"].includes(req.method.toUpperCase())
        ? undefined
        : (req.body as Buffer | undefined);
      if (upstream.vertexEmbeddingBatchCompat && body) {
        body = Buffer.from(transformVertexEmbeddingBatchRequest(
          Buffer.from(body as Buffer).toString("utf8"),
          upstream.modelId,
          upstream.vertexEmbeddingApiType,
        ));
        upstream.headers["content-type"] = "application/json";
      }
      const upstreamResponse = await fetch(upstreamUrl, {
        method: req.method,
        headers: upstream.headers,
        body,
        duplex: "half",
      } as RequestInit & { duplex: "half" });

      statusCode = upstreamResponse.status;
      res.status(statusCode);
      res.set(responseHeaders(upstreamResponse.headers));

      if (!upstreamResponse.body) {
        responseBody = "";
        res.end();
      } else if (upstream.vertexEmbeddingBatchCompat) {
        responseBody = await upstreamResponse.text();
        if (statusCode >= 200 && statusCode < 300) {
          responseBody = transformVertexEmbeddingBatchResponse(responseBody);
          res.set("content-type", "application/json; charset=utf-8");
        }
        res.send(responseBody);
      } else {
        const reader = upstreamResponse.body.getReader();
        const chunks = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(Buffer.from(value));
            res.write(Buffer.from(value));
          }
        }
        res.end();
        responseBody = Buffer.concat(chunks).toString("utf8");
      }

      usage = normalizeUsageForModel(modelId, extractUsage(responseBody));
      cost = statusCode >= 200 && statusCode < 300 ? calculateCost(modelId, usage) : 0;
      const auditPath = await saveAuditLog({
        req,
        fileName,
        apiKeyRow,
        provider,
        upstreamUrl,
        responseBody,
        statusCode,
        usage,
        cost,
      });

      recordUsage({
        userId: apiKeyRow.user_id,
        apiKeyId: apiKeyRow.id,
        modelId,
        endpoint: req.method,
        requestPath: req.originalUrl,
        statusCode,
        usage,
        cost,
        auditFile: auditPath,
      });
      touchApiKey(apiKeyRow.id);
    } catch (error) {
      const relayError = error as HttpError;
      statusCode = relayError.status || 502;
      responseBody = JSON.stringify({ error: "Relay upstream request failed", detail: errorMessage(error) });
      if (!res.headersSent) res.status(statusCode).json(JSON.parse(responseBody));
      const auditPath = await saveAuditLog({
        req,
        fileName,
        apiKeyRow,
        provider,
        upstreamUrl,
        responseBody,
        statusCode,
        usage,
        cost,
        error,
      });
      recordUsage({
        userId: apiKeyRow.user_id,
        apiKeyId: apiKeyRow.id,
        modelId,
        endpoint: req.method,
        requestPath: req.originalUrl,
        statusCode,
        usage,
        cost,
        auditFile: auditPath,
      });
    }
  },
];
