import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Save,
  Shield,
  Sun,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { api } from "./api.js";

const emptyStats = {
  cachedContentTokenCount: 0,
  promptTokenCount: 0,
  thoughtsTokenCount: 0,
  candidatesTokenCount: 0,
  billableCharacterCount: 0,
  cost: 0,
};

const messages = {
  zh: {
    account: "账户",
    admin: "管理",
    adminConsole: "管理控制台",
    aiStudioApiKey: "API Key",
    allModels: "全部模型",
    apiKeys: "API 密钥",
    availableModels: "可用模型",
    balance: "余额",
    balanceUnit: "USD",
    baseUrl: "Base URL",
    baseUrlHelp: "在 Google GenAI SDK 或兼容客户端的 Base URL 填写这个地址。",
    byDate: "按日期",
    byModel: "按模型",
    cachedTokens: "缓存输入",
    cacheHitRate: "缓存命中率",
    candidatesTokens: "候选token数",
    configKey: "Key",
    configured: "已配置",
    cumulativeTokens: "累计 Token 数",
    copy: "复制",
    copied: "已复制",
    cost: "费用",
    cancel: "取消",
    addPrice: "新增",
    cannotDeleteSelf: "不能删除当前登录用户",
    confirmAddPrice: "确认新增模型计费？",
    confirmDelete: "确认删除",
    confirmDeletePrice: "确认删除该模型计费？",
    confirmDeleteUser: "确认删除该用户？",
    confirmSaveBalance: "确认保存余额？",
    confirmClearProvider: "确认清空上游配置？",
    confirmSaveProvider: "确认保存上游配置？",
    currentProvider: "当前生效",
    create: "创建",
    createdAt: "创建时间",
    dashboard: "面板",
    date: "日期",
    deletePrice: "删除价格",
    deleteUser: "删除用户",
    dark: "暗",
    duplicateAlias: "已存在同名 API key 别名",
    endpoint: "Gemini REST",
    endpointHelp: "请求路径继续使用 Gemini REST 形状，只是在本地服务前加 /api。",
    embeddingInput: "嵌入",
    embeddingTokens: "嵌入",
    invalidJson: "请求体不是有效 JSON",
    fullKeyUnavailable: "旧密钥只保存了哈希，无法显示完整值。请新建一个 key 后复制。",
    globalStats: "全局统计",
    input: "输入",
    keyName: "别名",
    language: "语言",
    light: "亮",
    location: "Location",
    login: "登录",
    logout: "退出",
    model: "模型",
    modelExists: "该模型计费已存在，请先删除后再新增",
    modelDetails: "模型明细",
    modelPricing: "模型计费",
    newKey: "新建 API key",
    noData: "暂无记录",
    noUsableKey: "请新建一个可复制的 API key 后测试",
    notConfigured: "未配置",
    output: "输出",
    outputTokens: "输出",
    password: "密码",
    confirmPassword: "确认密码",
    hidePassword: "隐藏密码",
    passwordMismatch: "两次输入的密码不一致",
    requestBody: "请求体",
    requestPath: "请求路径",
    requestSuccessTotal: "成功请求 / 总请求数",
    response: "响应",
    pricing: "Pricing",
    processing: "处理中",
    provider: "Provider",
    providerKeyRequired: "请填写上游凭证",
    register: "注册",
    requestCount: "请求数",
    requestSuccessRate: "请求成功率",
    revoke: "删除",
    role: "角色",
    save: "保存",
    saveBalance: "保存余额",
    savePrice: "保存价格",
    selectKey: "选择 API key",
    sendTest: "发送测试",
    showPassword: "显示密码",
    signedIn: "已登录",
    system: "系统",
    theme: "主题",
    totalCost: "累计费用",
    totalConsumed: "累计费用",
    todayConsumed: "今日花费",
    testApi: "API 测试",
    uncachedTokens: "未缓存输入",
    unavailable: "不可用",
    upstreamConfig: "上游配置",
    usage: "用量",
    usageStats: "费用统计",
    userDashboard: "用户面板",
    username: "用户名",
    users: "用户",
    clearProvider: "清空配置",
    vertexServiceAccountJson: "服务账号",
  },
  en: {
    account: "Account",
    admin: "Admin",
    adminConsole: "Admin console",
    aiStudioApiKey: "API Key",
    allModels: "All models",
    apiKeys: "API keys",
    availableModels: "Available models",
    balance: "Balance",
    balanceUnit: "USD",
    baseUrl: "Base URL",
    baseUrlHelp: "Set this address as the Base URL in Google GenAI SDKs or compatible clients.",
    byDate: "By date",
    byModel: "By model",
    cachedTokens: "Cached tokens",
    cacheHitRate: "Cache hit rate",
    candidatesTokens: "Candidate tokens",
    configKey: "Key",
    configured: "Configured",
    cumulativeTokens: "Cumulative tokens",
    copy: "Copy",
    copied: "Copied",
    cost: "Cost",
    cancel: "Cancel",
    addPrice: "Add",
    cannotDeleteSelf: "Cannot delete the current signed-in user",
    confirmAddPrice: "Add this model pricing?",
    confirmDelete: "Confirm delete",
    confirmDeletePrice: "Delete this model pricing?",
    confirmDeleteUser: "Delete this user?",
    confirmSaveBalance: "Save this balance?",
    confirmClearProvider: "Clear upstream provider settings?",
    confirmSaveProvider: "Save upstream provider settings?",
    currentProvider: "Active provider",
    create: "Create",
    createdAt: "Created",
    dashboard: "Dashboard",
    date: "Date",
    deletePrice: "Delete price",
    deleteUser: "Delete user",
    dark: "Dark",
    duplicateAlias: "An API key alias with this name already exists",
    endpoint: "Gemini REST",
    endpointHelp: "Keep the Gemini REST path shape and prefix it with /api on this local service.",
    embeddingInput: "Embedding",
    embeddingTokens: "Embedding tokens",
    invalidJson: "Request body is not valid JSON",
    fullKeyUnavailable: "Older keys were stored as hashes only. Create a new key to copy its full value.",
    globalStats: "Global stats",
    input: "Input",
    keyName: "Alias",
    language: "Language",
    light: "Light",
    location: "Location",
    login: "Log in",
    logout: "Log out",
    model: "Model",
    modelExists: "This model pricing already exists. Delete it before adding it again.",
    modelDetails: "Model details",
    modelPricing: "Model pricing",
    newKey: "Create API key",
    noData: "No records",
    noUsableKey: "Create a copyable API key before testing",
    notConfigured: "Not configured",
    output: "Output",
    outputTokens: "Output tokens",
    password: "Password",
    confirmPassword: "Confirm password",
    hidePassword: "Hide password",
    passwordMismatch: "Passwords do not match",
    requestBody: "Request body",
    requestPath: "Request path",
    requestSuccessTotal: "Successful / total requests",
    response: "Response",
    pricing: "Pricing",
    processing: "Processing",
    provider: "Provider",
    providerKeyRequired: "Provider credential is required",
    register: "Register",
    requestCount: "Requests",
    requestSuccessRate: "Request success rate",
    revoke: "Delete",
    role: "Role",
    save: "Save",
    saveBalance: "Save balance",
    savePrice: "Save price",
    selectKey: "Select API key",
    sendTest: "Send test",
    showPassword: "Show password",
    signedIn: "Signed in",
    system: "System",
    theme: "Theme",
    totalCost: "Accumulated cost",
    totalConsumed: "Total spent",
    todayConsumed: "Today spent",
    testApi: "API test",
    uncachedTokens: "Uncached tokens",
    unavailable: "Unavailable",
    upstreamConfig: "Upstream config",
    usage: "Usage",
    usageStats: "Cost stats",
    userDashboard: "User dashboard",
    username: "Username",
    users: "Users",
    clearProvider: "Clear config",
    vertexServiceAccountJson: "Service account",
  },
};

const chartColors = {
  embedding: "#bfdbfe",
  cached: "#60a5fa",
  uncached: "#2563eb",
  output: "#1e3a8a",
};

const chartDepth = {
  embedding: 1,
  cached: 2,
  uncached: 3,
  output: 4,
};

function usageParts(row = {}) {
  const cached = Number(row.cachedContentTokenCount || 0);
  const prompt = Number(row.promptTokenCount || 0);
  const thoughts = Number(row.thoughtsTokenCount || 0);
  const candidates = Number(row.candidatesTokenCount || 0);
  return {
    cached,
    uncached: Math.max(prompt - cached, 0),
    output: thoughts + candidates,
    embedding: Number(row.billableCharacterCount || 0),
  };
}

function rawCostParts(row = {}) {
  return {
    cached: Number(row.cachedCost || 0),
    uncached: Number(row.uncachedCost || 0),
    output: Number(row.outputCost || 0),
    embedding: Number(row.embeddingCost || 0),
  };
}

function costParts(row = {}) {
  const parts = rawCostParts(row);
  const componentTotal = parts.cached + parts.uncached + parts.output + parts.embedding;
  const recordedTotal = Number(row.cost || 0);
  if (componentTotal === 0 && recordedTotal > 0) {
    return { ...parts, output: recordedTotal };
  }
  return parts;
}

function sumParts(parts) {
  return Object.values(parts).reduce((acc, value) => acc + Number(value || 0), 0);
}

function aggregateDailyRows(rows = []) {
  const byDate = new Map();
  for (const row of rows) {
    const date = row.date || "";
    if (!date) continue;
    const existing = byDate.get(date) || {
      date,
      requestCount: 0,
      successCount: 0,
      cachedContentTokenCount: 0,
      promptTokenCount: 0,
      thoughtsTokenCount: 0,
      candidatesTokenCount: 0,
      billableCharacterCount: 0,
      cost: 0,
      cachedCost: 0,
      uncachedCost: 0,
      outputCost: 0,
      embeddingCost: 0,
    };
    existing.requestCount += Number(row.requestCount || 0);
    existing.successCount += Number(row.successCount || 0);
    existing.cachedContentTokenCount += Number(row.cachedContentTokenCount || 0);
    existing.promptTokenCount += Number(row.promptTokenCount || 0);
    existing.thoughtsTokenCount += Number(row.thoughtsTokenCount || 0);
    existing.candidatesTokenCount += Number(row.candidatesTokenCount || 0);
    existing.billableCharacterCount += Number(row.billableCharacterCount || 0);
    existing.cost += Number(row.cost || 0);
    existing.cachedCost += Number(row.cachedCost || 0);
    existing.uncachedCost += Number(row.uncachedCost || 0);
    existing.outputCost += Number(row.outputCost || 0);
    existing.embeddingCost += Number(row.embeddingCost || 0);
    byDate.set(date, existing);
  }
  return [...byDate.values()].sort((left, right) => String(right.date).localeCompare(String(left.date)));
}

function outputTokens(row = {}) {
  return Number(row.thoughtsTokenCount || 0) + Number(row.candidatesTokenCount || 0);
}

function localeFor(lang) {
  return lang === "zh" ? "zh-CN" : "en-US";
}

function formatNumber(value, lang) {
  return new Intl.NumberFormat(localeFor(lang)).format(Number(value || 0));
}

function formatMoney(value, lang) {
  return new Intl.NumberFormat(localeFor(lang), {
    minimumFractionDigits: 4,
    maximumFractionDigits: 8,
  }).format(Number(value || 0));
}

function formatBalance(value, lang) {
  return new Intl.NumberFormat(localeFor(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatCost(value, lang) {
  return new Intl.NumberFormat(localeFor(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDollar(value, lang) {
  return `$${formatCost(value, lang)}`;
}

function formatPricePerMillion(value, lang) {
  return `${formatDollar(value, lang)}/M`;
}

function formatMillion(value, lang) {
  return `${new Intl.NumberFormat(localeFor(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0) / 1_000_000)}M`;
}

function formatCostWithUsage(cost, usage, lang) {
  return `${formatDollar(cost, lang)} (${formatMillion(usage, lang)})`;
}

function formatRequestRatio(successCount, requestCount, lang) {
  return `${formatNumber(successCount, lang)} / ${formatNumber(requestCount, lang)}`;
}

function formatPercent(value, lang) {
  return new Intl.NumberFormat(localeFor(lang), {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatPriceOrUnavailable(value, lang, t) {
  if (Number(value || 0) > 0) return formatMoney(value, lang);
  return <span className="price-unavailable" title={t.unavailable} aria-label={t.unavailable}>-</span>;
}

function modelPriceParts(item, t, lang) {
  return [
    [t.uncachedTokens, item.inputPrice],
    [t.output, item.outputPrice],
    [t.cachedTokens, item.cachePrice],
    [t.embeddingInput, item.embeddingInputPrice],
  ]
    .filter(([, value]) => Number(value || 0) > 0)
    .map(([label, value]) => `${label} ${formatPricePerMillion(value, lang)}`);
}

function isEmbeddingModelId(modelId = "") {
  return /embedding/i.test(modelId);
}

function preferredTestModel(models = []) {
  const modelIds = models.map((item) => item.modelId).filter(Boolean);
  return modelIds.includes("gemini-3.5-flash") ? "gemini-3.5-flash" : modelIds[0] || "gemini-3.5-flash";
}

function testPathForModel(modelId) {
  const action = isEmbeddingModelId(modelId) ? "batchEmbedContents" : "generateContent";
  return `/api/v1beta/models/${encodeURIComponent(modelId)}:${action}`;
}

function defaultTestBodyForModel(modelId) {
  if (isEmbeddingModelId(modelId)) {
    return {
      requests: [
        {
          model: modelId,
          content: {
            role: "user",
            parts: [{ text: "Who are you?" }],
          },
        },
      ],
    };
  }

  return {
    contents: [
      {
        role: "user",
        parts: [{ text: "Who are you?" }],
      },
    ],
  };
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function formatDateTime(value, lang) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(localeFor(lang), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function maskKey(value = "") {
  if (!value) return "";
  if (value.length <= 18) return value;
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}

function Stat({ label, value, tone = "blue" }) {
  return (
    <div className={`stat stat-${tone}`} aria-label={`${label}: ${value}`} title={label}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PreferenceControls({ lang, setLang, themeMode, setThemeMode, t }) {
  return (
    <div className="preference-controls" aria-label="preferences">
      <div className="mini-segment" aria-label={t.language}>
        <Languages size={15} aria-hidden="true" />
        <button className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")} type="button">中</button>
        <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")} type="button">EN</button>
      </div>
      <div className="mini-segment" aria-label={t.theme}>
        <button className={themeMode === "system" ? "active" : ""} onClick={() => setThemeMode("system")} title={t.system} type="button">
          <Monitor size={15} aria-hidden="true" />
        </button>
        <button className={themeMode === "light" ? "active" : ""} onClick={() => setThemeMode("light")} title={t.light} type="button">
          <Sun size={15} aria-hidden="true" />
        </button>
        <button className={themeMode === "dark" ? "active" : ""} onClick={() => setThemeMode("dark")} title={t.dark} type="button">
          <Moon size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function AuthScreen({ onAuthed, lang, setLang, themeMode, setThemeMode, t }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (mode === "register" && password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      const data = await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        body: { username, password },
      });
      onAuthed(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-topline">
          <PreferenceControls lang={lang} setLang={setLang} themeMode={themeMode} setThemeMode={setThemeMode} t={t} />
        </div>
        <h1>Ema Powerbank</h1>
        <div className="segmented" role="tablist" aria-label="auth mode">
          <button className={mode === "login" ? "active" : ""} onClick={() => {
            setMode("login");
            setError("");
          }} type="button">
            {t.login}
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => {
            setMode("register");
            setError("");
          }} type="button">
            {t.register}
          </button>
        </div>
        <form key={mode} onSubmit={submit} className={`form-stack auth-form auth-form-${mode}`}>
          <div className="field">
            <label htmlFor="auth-username">{t.username}</label>
            <input
              id="auth-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="auth-password">{t.password}</label>
            <div className="password-control">
              <input
                id="auth-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                aria-label={showPassword ? t.hidePassword : t.showPassword}
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                title={showPassword ? t.hidePassword : t.showPassword}
                type="button"
              >
                {showPassword ? <Eye size={17} aria-hidden="true" /> : <EyeOff size={17} aria-hidden="true" />}
              </button>
            </div>
          </div>
          {mode === "register" && (
            <div className="field">
              <label htmlFor="auth-confirm-password">{t.confirmPassword}</label>
              <div className="password-control">
                <input
                  id="auth-confirm-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                />
                <button
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  title={showPassword ? t.hidePassword : t.showPassword}
                  type="button"
                >
                  {showPassword ? <Eye size={17} aria-hidden="true" /> : <EyeOff size={17} aria-hidden="true" />}
                </button>
              </div>
            </div>
          )}
          {error && <div className="inline-error">{error}</div>}
          <button className="primary-btn full" disabled={busy} type="submit">
            <ChevronRight size={18} aria-hidden="true" />
            {busy ? t.processing : mode === "login" ? t.login : t.register}
          </button>
        </form>
      </section>
    </main>
  );
}

function CostBarChart({ rows = [], t, lang }) {
  const [activeSegment, setActiveSegment] = useState("");
  const chartRows = [...rows].reverse().slice(-14);
  const prepared = chartRows.map((row) => {
    const costs = costParts(row);
    const tokens = usageParts(row);
    const componentTotal = sumParts(costs);
    const total = componentTotal || Number(row.cost || 0);
    const tokenTotal = sumParts(tokens);
    return { row, costs, tokens, total, tokenTotal };
  });
  const maxTotal = Math.max(10, ...prepared.map((item) => item.total));
  const segments = [
    ["embedding", t.embeddingTokens],
    ["cached", t.cachedTokens],
    ["uncached", t.uncachedTokens],
    ["output", t.outputTokens],
  ];

  if (prepared.length === 0) {
    return <div className="chart-empty">{t.noData}</div>;
  }

  return (
    <div className="usage-chart">
      <div className="chart-legend">
        {segments.map(([key, label]) => (
          <button
            aria-pressed={activeSegment === key}
            className={`legend-item legend-${key} ${activeSegment === key ? "active" : ""} ${activeSegment && activeSegment !== key ? "dimmed" : ""}`}
            key={key}
            onFocus={() => setActiveSegment(key)}
            onBlur={() => setActiveSegment("")}
            onMouseEnter={() => setActiveSegment(key)}
            onMouseLeave={() => setActiveSegment("")}
            onPointerEnter={() => setActiveSegment(key)}
            onPointerLeave={() => setActiveSegment("")}
            type="button"
          >
            <i style={{ backgroundColor: chartColors[key] }} />
            {label}
          </button>
        ))}
      </div>
      <div className="chart-bars">
        {prepared.map(({ row, costs, tokens, total, tokenTotal }, index) => {
          const barHeight = Math.max(total === 0 ? 0 : 10, Math.round((total / maxTotal) * 180));
          const rawLabel = row.date || "";
          const label = rawLabel.slice(5);
          return (
            <div className="chart-day" key={`cost-${rawLabel}-${index}`}>
              <div className="bar-value" title={formatCostWithUsage(total, tokenTotal, lang)}>{formatDollar(total, lang)}</div>
              <div className="bar-shell">
                <div className="bar-stack" style={{ height: `${barHeight}px` }} title={`${rawLabel}: ${formatCostWithUsage(total, tokenTotal, lang)}`}>
                  {segments.map(([key, label]) => {
                    const value = costs[key];
                    if (!value || !total) return null;
                    return (
                      <div
                        key={key}
                        aria-label={`${label}: ${formatCostWithUsage(value, tokens[key], lang)}`}
                        className={`bar-segment segment-${key} ${activeSegment === key ? "active" : ""} ${activeSegment && activeSegment !== key ? "dimmed" : ""}`}
                        onFocus={() => setActiveSegment(key)}
                        onBlur={() => setActiveSegment("")}
                        onMouseEnter={() => setActiveSegment(key)}
                        onMouseLeave={() => setActiveSegment("")}
                        onPointerEnter={() => setActiveSegment(key)}
                        onPointerLeave={() => setActiveSegment("")}
                        role="button"
                        style={{
                          height: `${Math.max(2, (value / total) * 100)}%`,
                          backgroundColor: chartColors[key],
                          zIndex: chartDepth[key],
                        }}
                        tabIndex={0}
                        title={`${rawLabel} ${label}: ${formatCostWithUsage(value, tokens[key], lang)}`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="bar-label" title={rawLabel}>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsageTable({ rows = [], t, lang }) {
  const [sort, setSort] = useState({ key: "date", direction: "desc" });
  const [selectedDate, setSelectedDate] = useState("");
  const columns = [
    { key: "date", label: t.date, align: "" },
    { key: "requestCount", label: t.requestSuccessTotal, align: "right" },
    { key: "cost", label: t.totalCost, align: "right" },
    { key: "cachedCost", label: t.cachedTokens, align: "right" },
    { key: "uncachedCost", label: t.uncachedTokens, align: "right" },
    { key: "outputCost", label: t.outputTokens, align: "right" },
    { key: "embeddingCost", label: t.embeddingTokens, align: "right" },
  ];
  const preparedRows = useMemo(() => rows.map((row) => {
    const tokens = usageParts(row);
    const costs = costParts(row);
    return {
      ...row,
      requestCount: Number(row.requestCount || 0),
      successCount: Number(row.successCount || 0),
      cached: tokens.cached,
      uncached: tokens.uncached,
      output: tokens.output,
      embedding: tokens.embedding,
      totalTokens: sumParts(tokens),
      cachedCost: costs.cached,
      uncachedCost: costs.uncached,
      outputCost: costs.output,
      embeddingCost: costs.embedding,
      cost: Number(row.cost || 0) || sumParts(costs),
    };
  }), [rows]);
  const sortedRows = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...preparedRows].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      if (sort.key === "date") {
        return String(left).localeCompare(String(right)) * direction;
      }
      return (Number(left || 0) - Number(right || 0)) * direction;
    });
  }, [preparedRows, sort]);

  function changeSort(key) {
    setSort((current) => (
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "date" ? "desc" : "desc" }
    ));
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.align} key={column.key}>
                <button className="table-sort" onClick={() => changeSort(column.key)} type="button">
                  {column.label}
                  <span>{sort.key === column.key ? (sort.direction === "asc" ? "↑" : "↓") : ""}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan="7" className="empty-cell">{t.noData}</td>
            </tr>
          ) : sortedRows.map((row) => (
              <tr className={selectedDate === row.date ? "selected" : ""} key={row.date} onClick={() => setSelectedDate(row.date)}>
                <td>{row.date}</td>
                <td className="right">{formatRequestRatio(row.successCount, row.requestCount, lang)}</td>
                <td className="right">{formatDollar(row.cost, lang)}</td>
                <td className="right">{formatCostWithUsage(row.cachedCost, row.cached, lang)}</td>
                <td className="right">{formatCostWithUsage(row.uncachedCost, row.uncached, lang)}</td>
                <td className="right">{formatCostWithUsage(row.outputCost, row.output, lang)}</td>
                <td className="right">{formatCostWithUsage(row.embeddingCost, row.embedding, lang)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function ModelUsageTable({ rows = [], t, lang }) {
  const [sort, setSort] = useState({ key: "cost", direction: "desc" });
  const columns = [
    { key: "modelId", label: t.model, align: "" },
    { key: "requestCount", label: t.requestCount, align: "right" },
    { key: "cached", label: t.cachedTokens, align: "right" },
    { key: "uncached", label: t.uncachedTokens, align: "right" },
    { key: "output", label: t.outputTokens, align: "right" },
    { key: "embedding", label: t.embeddingTokens, align: "right" },
    { key: "cost", label: t.cost, align: "right" },
  ];
  const preparedRows = useMemo(() => rows.map((row) => {
    const parts = usageParts(row);
    return {
      ...row,
      modelId: row.modelId || "unknown",
      requestCount: Number(row.requestCount || 0),
      cached: parts.cached,
      uncached: parts.uncached,
      output: parts.output,
      embedding: parts.embedding,
      cost: Number(row.cost || 0),
    };
  }), [rows]);
  const sortedRows = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...preparedRows].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      if (sort.key === "modelId") return String(left).localeCompare(String(right)) * direction;
      return (Number(left || 0) - Number(right || 0)) * direction;
    });
  }, [preparedRows, sort]);

  function changeSort(key) {
    setSort((current) => (
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "modelId" ? "asc" : "desc" }
    ));
  }

  return (
    <div className="model-usage-block">
      <h3>{t.modelDetails}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th className={column.align} key={column.key}>
                  <button className="table-sort" onClick={() => changeSort(column.key)} type="button">
                    {column.label}
                    <span>{sort.key === column.key ? (sort.direction === "asc" ? "↑" : "↓") : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">{t.noData}</td>
              </tr>
            ) : sortedRows.map((row) => (
              <tr key={row.modelId}>
                <td><code>{row.modelId}</code></td>
                <td className="right">{formatNumber(row.requestCount, lang)}</td>
                <td className="right">{formatNumber(row.cached, lang)}</td>
                <td className="right">{formatNumber(row.uncached, lang)}</td>
                <td className="right">{formatNumber(row.output, lang)}</td>
                <td className="right">{formatNumber(row.embedding, lang)}</td>
                <td className="right">{formatCost(row.cost, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsageStatsPanel({ dailyRows = [], dailyModelRows = [], modelRows = [], t, lang }) {
  const [selectedModels, setSelectedModels] = useState([]);
  const [modelSelectionReady, setModelSelectionReady] = useState(false);
  const modelSourceRows = dailyModelRows.length ? dailyModelRows : modelRows;
  const sourceRows = dailyModelRows.length ? dailyModelRows : dailyRows;
  const modelOptions = useMemo(() => (
    [...new Set(modelSourceRows.map((row) => row.modelId).filter(Boolean))]
      .sort((left, right) => String(left).localeCompare(String(right)))
  ), [modelSourceRows]);
  const filteredRows = useMemo(() => {
    const selectedSet = new Set(selectedModels);
    const rows = modelOptions.length === 0 || selectedModels.length === modelOptions.length
      ? sourceRows
      : sourceRows.filter((row) => selectedSet.has(row.modelId));
    return aggregateDailyRows(rows);
  }, [modelOptions, selectedModels, sourceRows]);

  useEffect(() => {
    setSelectedModels((current) => {
      if (modelOptions.length === 0) return [];
      if (!modelSelectionReady) return modelOptions;
      const next = current.filter((modelId) => modelOptions.includes(modelId));
      return next.length === current.length ? current : next;
    });
    if (modelOptions.length > 0 && !modelSelectionReady) setModelSelectionReady(true);
    if (modelOptions.length === 0 && modelSelectionReady) setModelSelectionReady(false);
  }, [modelOptions, modelSelectionReady]);

  function toggleModel(modelId, checked) {
    setSelectedModels((current) => {
      if (checked) return [...new Set([...current, modelId])];
      return current.filter((item) => item !== modelId);
    });
  }

  return (
    <>
      <div className="usage-controls">
        <div className="model-checkboxes" role="group" aria-label={t.model}>
          <span className="usage-control-label">{t.model}</span>
          {modelOptions.map((modelId) => (
            <label key={modelId}>
              <input
                checked={selectedModels.includes(modelId)}
                onChange={(event) => toggleModel(modelId, event.target.checked)}
                type="checkbox"
              />
              <span>{modelId}</span>
            </label>
          ))}
        </div>
      </div>
      <CostBarChart rows={filteredRows} t={t} lang={lang} />
      <UsageTable rows={filteredRows} t={t} lang={lang} />
    </>
  );
}

function ApiTestPanel({ apiKeys = [], availableModels = [], reload, t }) {
  const usableKeys = apiKeys.filter((item) => item.key);
  const modelOptions = useMemo(() => availableModels.map((item) => item.modelId).filter(Boolean), [availableModels]);
  const initialModel = preferredTestModel(availableModels);
  const [selectedKey, setSelectedKey] = useState(usableKeys[0]?.key || "");
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const [requestBody, setRequestBody] = useState(formatJson(defaultTestBodyForModel(initialModel)));
  const [responseText, setResponseText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestPath = testPathForModel(selectedModel);

  useEffect(() => {
    if (!usableKeys.some((item) => item.key === selectedKey)) {
      setSelectedKey(usableKeys[0]?.key || "");
    }
  }, [apiKeys]);

  useEffect(() => {
    const nextModel = modelOptions.includes(selectedModel) ? selectedModel : preferredTestModel(availableModels);
    if (nextModel !== selectedModel) {
      setSelectedModel(nextModel);
      setRequestBody(formatJson(defaultTestBodyForModel(nextModel)));
    }
  }, [availableModels, modelOptions, selectedModel]);

  function changeModel(modelId) {
    setSelectedModel(modelId);
    setRequestBody(formatJson(defaultTestBodyForModel(modelId)));
    setError("");
    setResponseText("");
  }

  async function sendTest(event) {
    event.preventDefault();
    setError("");
    setResponseText("");
    let payload;
    try {
      payload = JSON.parse(requestBody);
    } catch {
      setError(t.invalidJson);
      return;
    }

    const trimmedPath = requestPath.trim();
    const url = trimmedPath.startsWith("http") ? trimmedPath : trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;
    setBusy(true);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": selectedKey,
        },
        body: JSON.stringify(payload),
      });
      const raw = await response.text();
      let formatted = raw;
      try {
        formatted = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        formatted = raw || "";
      }
      setResponseText(`HTTP ${response.status} ${response.statusText}\n${formatted}`);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel test-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">{t.testApi}</span>
          <h2>{t.testApi}</h2>
        </div>
      </div>
      <form className="api-test-form" onSubmit={sendTest}>
        <label>
          {t.selectKey}
          <select disabled={usableKeys.length === 0} value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
            {usableKeys.length === 0 ? (
              <option value="">{t.noUsableKey}</option>
            ) : usableKeys.map((item) => (
              <option key={item.id} value={item.key}>{item.name} · {item.keyPrefix}...</option>
            ))}
          </select>
        </label>
        <label>
          {t.model}
          <select value={selectedModel} onChange={(event) => changeModel(event.target.value)}>
            {(modelOptions.length ? modelOptions : [selectedModel]).map((modelId) => (
              <option key={modelId} value={modelId}>{modelId}</option>
            ))}
          </select>
        </label>
        <label>
          {t.requestBody}
          <textarea value={requestBody} onChange={(event) => setRequestBody(event.target.value)} />
        </label>
        {error && <div className="inline-error">{error}</div>}
        <button className="primary-btn" disabled={!selectedKey || busy} type="submit">
          <ChevronRight size={18} aria-hidden="true" />
          {busy ? t.processing : t.sendTest}
        </button>
      </form>
      {responseText && (
        <div className="response-box">
          <span>{t.response}</span>
          <pre>{responseText}</pre>
        </div>
      )}
    </section>
  );
}

function Dashboard({ overview, reload, t, lang }) {
  const [keyName, setKeyName] = useState("default");
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const baseUrl = `${window.location.origin}/api`;
  const usageSummary = overview.usageSummary || {};

  async function createKey(event) {
    event.preventDefault();
    setError("");
    const normalizedName = keyName.trim() || "Default key";
    if (overview.apiKeys.some((item) => item.name === normalizedName)) {
      setError(t.duplicateAlias);
      return;
    }
    try {
      await api("/api/keys", {
        method: "POST",
        body: { name: normalizedName },
      });
      setIsKeyDialogOpen(false);
      setKeyName("default");
      await reload();
    } catch (err) {
      setError(err.message === "API key alias already exists" ? t.duplicateAlias : err.message);
    }
  }

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function revokeKey(id) {
    await api(`/api/keys/${id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await reload();
  }

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setToast(t.copied);
  }

  return (
    <div className="page-grid">
      <section className="panel wide account-panel">
        <div className="account-strip account-summary-strip">
          <div className="stats-grid account-stats account-summary-stats">
            <Stat label={t.balance} value={formatDollar(overview.user.balance, lang)} />
            <Stat label={t.totalConsumed} value={formatDollar(usageSummary.totalCost, lang)} tone="rose" />
            <Stat label={t.todayConsumed} value={formatDollar(usageSummary.todayCost, lang)} tone="amber" />
            <Stat label={t.requestSuccessRate} value={formatPercent(usageSummary.successRate, lang)} tone="green" />
          </div>
        </div>
      </section>

      <section className="panel credentials-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">{t.apiKeys}</span>
            <h2>{t.apiKeys}</h2>
          </div>
          <button className="icon-btn primary" title={t.newKey} onClick={() => {
            setError("");
            setIsKeyDialogOpen(true);
          }} type="button">
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
        {error && !isKeyDialogOpen && <div className="inline-error">{error}</div>}
        <div className="key-list">
          {overview.apiKeys.map((item) => (
            <div className="key-row" key={item.id}>
              <KeyRound size={16} aria-hidden="true" />
              <div>
                <strong>{item.name}</strong>
                {item.key ? <code>{maskKey(item.key)}</code> : <span>{item.keyPrefix}... · {t.fullKeyUnavailable}</span>}
                <span>{t.createdAt}: {formatDateTime(item.createdAt, lang)}</span>
              </div>
              {item.key && (
                <button className="icon-btn" title={t.copy} onClick={() => copy(item.key)} type="button">
                  <Copy size={16} aria-hidden="true" />
                </button>
              )}
              <button className="icon-btn danger" title={t.revoke} onClick={() => setDeleteTarget(item)} type="button">
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <div className="base-url-block">
          <div className="section-head compact-head">
            <h2>{t.baseUrl}</h2>
          </div>
          <p className="panel-note">{t.baseUrlHelp}</p>
          <div className="endpoint-box">
            <code>{baseUrl}</code>
            <button className="icon-btn" title={t.copy} onClick={() => copy(baseUrl)} type="button">
              <Copy size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="model-id-block">
          <div className="section-head compact-head">
            <h2>{t.availableModels}</h2>
          </div>
          <div className="model-id-list">
            {(overview.availableModels || []).length === 0 ? (
              <div className="empty-model-list">{t.noData}</div>
            ) : (overview.availableModels || []).map((item) => (
              <div className="model-id-row" key={item.modelId}>
                <code>{item.modelId}</code>
                <div className="model-price-line">
                  {modelPriceParts(item, t, lang).map((part) => (
                    <span key={part}>{part}</span>
                  ))}
                </div>
                <button className="icon-btn" title={t.copy} onClick={() => copy(item.modelId)} type="button">
                  <Copy size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ApiTestPanel apiKeys={overview.apiKeys} availableModels={overview.availableModels || []} reload={reload} t={t} />

      <section className="panel wide usage-panel">
        <div className="section-head">
          <div>
            <h2>{t.usageStats}</h2>
          </div>
        </div>
        <UsageStatsPanel
          dailyRows={overview.dailyStats || []}
          dailyModelRows={overview.dailyModelStats || []}
          modelRows={overview.modelStats || []}
          t={t}
          lang={lang}
        />
      </section>
      {isKeyDialogOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="new-key-title">
            <div className="section-head">
              <h2 id="new-key-title">{t.newKey}</h2>
            </div>
            <form className="modal-form" onSubmit={createKey}>
              <label>
                {t.keyName}
                <input
                  autoFocus
                  aria-label={t.keyName}
                  value={keyName}
                  onChange={(event) => {
                    setKeyName(event.target.value);
                    setError("");
                  }}
                />
              </label>
              {error && <div className="inline-error">{error}</div>}
              <div className="modal-actions">
                <button className="icon-btn" title={t.cancel} onClick={() => {
                  setIsKeyDialogOpen(false);
                  setError("");
                }} type="button">
                  <X size={16} aria-hidden="true" />
                </button>
                <button className="primary-btn" type="submit">
                  <Plus size={18} aria-hidden="true" />
                  {t.create}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {deleteTarget && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="delete-key-title">
            <div className="section-head">
              <h2 id="delete-key-title">{t.confirmDelete}</h2>
            </div>
            <p className="modal-copy">{deleteTarget.name}</p>
            <div className="modal-actions">
              <button className="icon-btn" title={t.cancel} onClick={() => setDeleteTarget(null)} type="button">
                <X size={16} aria-hidden="true" />
              </button>
              <button className="primary-btn danger-action" onClick={() => revokeKey(deleteTarget.id)} type="button">
                <Trash2 size={18} aria-hidden="true" />
                {t.revoke}
              </button>
            </div>
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function ProviderForm({ provider, reload, t }) {
  const [mode, setMode] = useState(provider?.mode || "ai_studio");
  const [location, setLocation] = useState(provider?.location || "global");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const configuredModeLabel = provider?.mode === "vertex" ? "Vertex AI" : "AI Studio";
  const editingModeLabel = mode === "vertex" ? "Vertex AI" : "AI Studio";
  const aiStudioPlaceholder = provider?.mode === "ai_studio" && provider?.keyPreview && !provider.keyPreview.trim().startsWith("{")
    ? provider.keyPreview
    : "AIza...";
  const vertexPlaceholder = provider?.mode === "vertex" ? provider?.keyPreview || "" : '{\n  "type": "service_account",\n  "project_id": "..."\n}';

  useEffect(() => {
    setMode(provider?.mode || "ai_studio");
    setLocation(provider?.location || "global");
  }, [provider]);

  async function save(event) {
    event?.preventDefault();
    setError("");
    if (!key.trim()) {
      setError(t.providerKeyRequired);
      return;
    }
    if (!window.confirm(t.confirmSaveProvider)) return;
    try {
      await api("/api/admin/provider", {
        method: "POST",
        body: { mode, location: mode === "vertex" ? location : "", key },
      });
      setKey("");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function clearConfig() {
    setError("");
    if (!window.confirm(t.confirmClearProvider)) return;
    try {
      await api("/api/admin/provider", { method: "DELETE" });
      setKey("");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">{t.provider}</span>
          <h2>{t.upstreamConfig}</h2>
        </div>
        {provider?.configured ? (
          <button className="pill ok clear-provider-btn" onClick={clearConfig} type="button">
            {t.clearProvider}
          </button>
        ) : (
          <span className="pill">{t.notConfigured}</span>
        )}
      </div>
      <form className="form-stack" onSubmit={save}>
        {provider?.configured && (
          <div className="provider-summary">
            <span>{t.currentProvider}</span>
            <strong>{configuredModeLabel}</strong>
            {provider.mode === "vertex" && (
              <small>
                {provider.projectId ? `Project: ${provider.projectId}` : ""}
                {provider.location ? `${provider.projectId ? " · " : ""}${t.location}: ${provider.location}` : ""}
              </small>
            )}
          </div>
        )}
        <div className="segmented compact provider-mode-toggle" role="tablist" aria-label="provider type">
          <button className={mode === "ai_studio" ? "active" : ""} onClick={() => setMode("ai_studio")} type="button">
            AI Studio
          </button>
          <button className={mode === "vertex" ? "active" : ""} onClick={() => setMode("vertex")} type="button">
            Vertex AI
          </button>
        </div>
        {mode === "vertex" && (
          <label>
            {t.location}
            <input value={location} onChange={(event) => setLocation(event.target.value)} />
          </label>
        )}
        <label>
          {mode === "vertex" ? t.vertexServiceAccountJson : t.aiStudioApiKey}
          {mode === "vertex" ? (
            <textarea value={key} onChange={(event) => setKey(event.target.value)} rows={6} placeholder={vertexPlaceholder} />
          ) : (
            <input type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder={aiStudioPlaceholder} />
          )}
        </label>
        {error && <div className="inline-error">{error}</div>}
        <button className="primary-btn" type="submit">
          <Save size={18} aria-hidden="true" />
          {t.save} {editingModeLabel}
        </button>
      </form>
    </section>
  );
}

function PricingPanel({ pricing, reload, t, lang }) {
  const [form, setForm] = useState({
    modelId: "",
    inputPrice: "",
    outputPrice: "",
    cachePrice: "",
    embeddingInputPrice: "",
  });
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();
    setError("");
    const modelId = form.modelId.trim();
    if (pricing.some((item) => item.modelId === modelId)) {
      setError(t.modelExists);
      return;
    }
    if (!window.confirm(t.confirmAddPrice)) return;
    try {
      await api("/api/admin/pricing", { method: "POST", body: { ...form, modelId } });
      await reload();
    } catch (err) {
      setError(err.message === "Pricing model already exists" ? t.modelExists : err.message);
    }
  }

  async function remove(id) {
    setError("");
    if (!window.confirm(t.confirmDeletePrice)) return;
    try {
      await api(`/api/admin/pricing/${id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="panel wide">
      <div className="section-head">
        <div>
          <span className="eyebrow">{t.pricing}</span>
          <h2>{t.modelPricing}</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.model}</th>
              <th>{t.uncachedTokens}</th>
              <th>{t.output}</th>
              <th>{t.cachedTokens}</th>
              <th>{t.embeddingInput}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((item) => (
              <tr key={item.id}>
                <td><code>{item.modelId}</code></td>
                <td>{formatPriceOrUnavailable(item.inputPrice, lang, t)}</td>
                <td>{formatPriceOrUnavailable(item.outputPrice, lang, t)}</td>
                <td>{formatPriceOrUnavailable(item.cachePrice, lang, t)}</td>
                <td>{formatPriceOrUnavailable(item.embeddingInputPrice, lang, t)}</td>
                <td className="right">
                  <button className="icon-btn danger" title={t.deletePrice} onClick={() => remove(item.id)} type="button">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            <tr className="pricing-add-row">
              <td>
                <input aria-label={t.model} value={form.modelId} onChange={(event) => update("modelId", event.target.value)} />
              </td>
              <td>
                <input aria-label={t.uncachedTokens} type="number" step="0.000001" value={form.inputPrice} onChange={(event) => update("inputPrice", event.target.value)} />
              </td>
              <td>
                <input aria-label={t.output} type="number" step="0.000001" value={form.outputPrice} onChange={(event) => update("outputPrice", event.target.value)} />
              </td>
              <td>
                <input aria-label={t.cachedTokens} type="number" step="0.000001" value={form.cachePrice} onChange={(event) => update("cachePrice", event.target.value)} />
              </td>
              <td>
                <input aria-label={t.embeddingInput} type="number" step="0.000001" value={form.embeddingInputPrice} onChange={(event) => update("embeddingInputPrice", event.target.value)} />
              </td>
              <td className="right">
                <button className="primary-btn compact-action" title={t.addPrice} onClick={save} type="button">
                  <Plus size={17} aria-hidden="true" />
                  {t.addPrice}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {error && <div className="inline-error">{error}</div>}
    </section>
  );
}

function UsersPanel({ users, reload, t, currentUser }) {
  const [balances, setBalances] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    setBalances(Object.fromEntries(users.map((user) => [user.id, Number(user.balance || 0).toFixed(4)])));
  }, [users]);

  function formatBalanceEdit(userId) {
    setBalances((current) => ({
      ...current,
      [userId]: Number(current[userId] || 0).toFixed(4),
    }));
  }

  async function save(userId) {
    setError("");
    if (!window.confirm(t.confirmSaveBalance)) return;
    try {
      await api(`/api/admin/users/${userId}/balance`, {
        method: "PATCH",
        body: { balance: balances[userId] },
      });
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(userId) {
    setError("");
    if (userId === currentUser?.id) {
      setError(t.cannotDeleteSelf);
      return;
    }
    if (!window.confirm(t.confirmDeleteUser)) return;
    try {
      await api(`/api/admin/users/${userId}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel wide">
      <div className="section-head">
        <div>
          <span className="eyebrow">{t.users}</span>
          <h2>{t.balance}</h2>
        </div>
      </div>
      {error && <div className="inline-error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.username}</th>
              <th>{t.role}</th>
              <th>{t.balance}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td>{item.username}</td>
                <td>{item.role}</td>
                <td>
                  <input
                    className="cell-input"
                    type="number"
                    step="0.0001"
                    value={balances[item.id] ?? 0}
                    onChange={(event) => setBalances((current) => ({ ...current, [item.id]: event.target.value }))}
                    onBlur={() => formatBalanceEdit(item.id)}
                  />
                </td>
                <td className="right">
                  <button className="icon-btn primary" title={t.saveBalance} onClick={() => save(item.id)} type="button">
                    <Save size={16} aria-hidden="true" />
                  </button>
                  <button className="icon-btn danger" disabled={item.id === currentUser?.id} title={item.id === currentUser?.id ? t.cannotDeleteSelf : t.deleteUser} onClick={() => remove(item.id)} type="button">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminPanel({ data, reload, t, lang, currentUser }) {
  const totals = data.totals || emptyStats;
  const parts = usageParts(totals);
  const cacheHitDenominator = parts.cached + parts.uncached;
  const cacheHitRate = cacheHitDenominator > 0 ? parts.cached / cacheHitDenominator : 0;
  const totalTokens = parts.cached + parts.uncached + parts.output + parts.embedding;
  const requestCount = Number(totals.requestCount || 0);
  const successRate = requestCount > 0 ? Number(totals.successCount || 0) / requestCount : 0;
  return (
    <div className="page-grid">
      <div className="admin-top-row">
        <ProviderForm provider={data.provider} reload={reload} t={t} />
        <section className="panel admin-stats-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t.admin}</span>
              <h2>{t.globalStats}</h2>
            </div>
          </div>
          <div className="stats-grid">
            <Stat label={t.totalCost} value={formatDollar(totals.totalCost, lang)} tone="rose" />
            <Stat label={t.todayConsumed} value={formatDollar(totals.todayCost, lang)} tone="amber" />
            <Stat label={t.requestCount} value={formatNumber(totals.requestCount, lang)} />
            <Stat label={t.requestSuccessRate} value={formatPercent(successRate, lang)} tone="green" />
            <Stat label={t.cumulativeTokens} value={formatNumber(totalTokens, lang)} tone="blue" />
            <Stat label={t.cacheHitRate} value={formatPercent(cacheHitRate, lang)} tone="blue" />
          </div>
        </section>
      </div>
      <PricingPanel pricing={data.pricing || []} reload={reload} t={t} lang={lang} />
      <UsersPanel users={data.users || []} reload={reload} t={t} currentUser={currentUser} />
      <section className="panel wide usage-panel">
        <div className="section-head">
          <div>
            <h2>{t.usageStats}</h2>
          </div>
        </div>
        <UsageStatsPanel
          dailyRows={data.dailyStats || []}
          dailyModelRows={data.dailyModelStats || []}
          modelRows={data.modelStats || []}
          t={t}
          lang={lang}
        />
      </section>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("dashboard");
  const [overview, setOverview] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [error, setError] = useState("");
  const [lang, setLangState] = useState(() => localStorage.getItem("relay_lang") || "zh");
  const [themeMode, setThemeModeState] = useState(() => localStorage.getItem("relay_theme") || "system");
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  const t = messages[lang] || messages.zh;

  function setLang(value) {
    localStorage.setItem("relay_lang", value);
    setLangState(value);
  }

  function setThemeMode(value) {
    localStorage.setItem("relay_theme", value);
    setThemeModeState(value);
  }

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return undefined;
    const onChange = (event) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const resolved = themeMode === "system" ? (systemDark ? "dark" : "light") : themeMode;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themeMode = themeMode;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [themeMode, systemDark, lang]);

  async function loadSession() {
    setLoading(true);
    try {
      const data = await api("/api/session");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboard() {
    if (!user) return;
    const data = await api("/api/me/overview");
    setOverview(data);
  }

  async function loadAdmin() {
    if (user?.role !== "admin") return;
    const data = await api("/api/admin/overview");
    setAdminData(data);
  }

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (!user) return;
    setError("");
    loadDashboard().catch((err) => setError(err.message));
    if (user.role === "admin") loadAdmin().catch((err) => setError(err.message));
  }, [user]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOverview(null);
    setAdminData(null);
  }

  if (loading) return <div className="loading">Loading</div>;
  if (!user) {
    return (
      <AuthScreen
        onAuthed={setUser}
        lang={lang}
        setLang={setLang}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        t={t}
      />
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="app-title">
          <span>Ema Powerbank</span>
        </div>
        <nav>
          <button className={active === "dashboard" ? "active" : ""} onClick={() => setActive("dashboard")} type="button">
            <UserRound size={18} aria-hidden="true" />
            {t.dashboard}
          </button>
          {user.role === "admin" && (
            <button className={active === "admin" ? "active" : ""} onClick={() => setActive("admin")} type="button">
              <Shield size={18} aria-hidden="true" />
              {t.admin}
            </button>
          )}
        </nav>
      </aside>
      <section className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">{t.signedIn}</span>
            <h1>{active === "admin" ? t.adminConsole : t.userDashboard}</h1>
          </div>
          <div className="topbar-actions">
            <PreferenceControls lang={lang} setLang={setLang} themeMode={themeMode} setThemeMode={setThemeMode} t={t} />
            <span className="user-chip">
              <strong>{user.username}</strong>
            </span>
            <button className="icon-btn" title={t.logout} onClick={logout} type="button">
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </header>
        {error && <div className="inline-error">{error}</div>}
        {active === "admin" && user.role === "admin"
          ? adminData && <AdminPanel data={adminData} reload={loadAdmin} t={t} lang={lang} currentUser={user} />
          : overview && <Dashboard overview={overview} reload={loadDashboard} t={t} lang={lang} />}
      </section>
    </main>
  );
}
