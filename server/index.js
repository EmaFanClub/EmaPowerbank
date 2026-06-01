import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import {
  clearProviderConfig,
  db,
  createPricing,
  deletePricing,
  getProviderConfig,
  isoNow,
  listPricing,
  publicUser,
  saveProviderConfig,
} from "./db.js";
import {
  clearSessionCookie,
  createApiKey,
  hashPassword,
  listUserApiKeys,
  requireAdmin,
  requireSession,
  sanitizeUser,
  setSessionCookie,
  signSession,
  verifyPassword,
} from "./auth.js";
import {
  adminDailyStats,
  adminDailyModelStats,
  adminModelStats,
  recentUsage,
  userDailyStats,
  userDailyModelStats,
  userModelStats,
} from "./billing.js";
import { createGoogleGenAIClient, normalizeProviderConfig } from "./googleProvider.js";
import { proxyMiddlewares } from "./proxy.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
app.use(cookieParser());
app.use((req, res, next) => {
  if (!/^\/api\/v1(?:alpha|beta1?)?\//.test(req.path)) return next();
  return proxyMiddlewares[0](req, res, (error) => {
    if (error) return next(error);
    return proxyMiddlewares[1](req, res, next);
  });
});
app.use(express.json({ limit: "2mb" }));

const userSelect = `
  SELECT id, username, role, balance, created_at, updated_at
  FROM users
`;

function listAvailableModels() {
  return listPricing()
    .filter((item) => [
      item.inputPrice,
      item.outputPrice,
      item.cachePrice,
      item.embeddingInputPrice,
    ].some((value) => Number(value) > 0))
    .map((item) => ({
      modelId: item.modelId,
      inputPrice: item.inputPrice,
      outputPrice: item.outputPrice,
      cachePrice: item.cachePrice,
      embeddingInputPrice: item.embeddingInputPrice,
    }));
}

function requireFields(body, fields) {
  for (const field of fields) {
    if (!String(body?.[field] || "").trim()) {
      const error = new Error(`${field} is required`);
      error.status = 400;
      throw error;
    }
  }
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: isoNow() });
});

app.get("/api/session", (req, res) => {
  const token = req.cookies?.relay_session;
  if (!token) return res.json({ user: null });
  try {
    requireSession(req, res, () => res.json({ user: sanitizeUser(req.user) }));
  } catch {
    res.json({ user: null });
  }
});

app.post("/api/auth/register", asyncHandler(async (req, res) => {
  requireFields(req.body, ["username", "password"]);
  const username = String(req.body.username).trim();
  const password = String(req.body.password);
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
    return res.status(400).json({ error: "Username must be 3-32 characters: letters, numbers, _ or -" });
  }
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const passwordHash = await hashPassword(password);
  const ts = isoNow();

  try {
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, role, balance, created_at, updated_at)
      VALUES (?, ?, 'user', 0, ?, ?)
    `).run(username, passwordHash, ts, ts);
    const user = db.prepare(`${userSelect} WHERE id = ?`).get(result.lastInsertRowid);
    setSessionCookie(res, signSession(user));
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Username already exists" });
    }
    throw error;
  }
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  requireFields(req.body, ["username", "password"]);
  const username = String(req.body.username).trim();
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!row || !(await verifyPassword(String(req.body.password), row.password_hash))) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  setSessionCookie(res, signSession(row));
  res.json({ user: publicUser(row) });
}));

app.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get("/api/me/overview", requireSession, (req, res) => {
  const today = isoNow().slice(0, 10);
  const usageSummary = db.prepare(`
    SELECT
      COUNT(*) AS requestCount,
      SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) AS successCount,
      COALESCE(SUM(cost), 0) AS totalCost,
      COALESCE(SUM(CASE WHEN usage_date = ? THEN cost ELSE 0 END), 0) AS todayCost
    FROM usage_records
    WHERE user_id = ?
  `).get(today, req.user.id);
  const requestCount = Number(usageSummary.requestCount || 0);
  const successCount = Number(usageSummary.successCount || 0);

  res.json({
    user: publicUser(req.user),
    apiKeys: listUserApiKeys(req.user.id),
    dailyStats: userDailyStats(req.user.id),
    dailyModelStats: userDailyModelStats(req.user.id),
    modelStats: userModelStats(req.user.id),
    usageSummary: {
      requestCount,
      successCount,
      totalCost: Number(usageSummary.totalCost || 0),
      todayCost: Number(usageSummary.todayCost || 0),
      successRate: requestCount > 0 ? successCount / requestCount : 0,
    },
    availableModels: listAvailableModels(),
    recentUsage: recentUsage(req.user.id),
  });
});

app.post("/api/keys", requireSession, (req, res) => {
  try {
    const created = createApiKey(req.user.id, req.body?.name);
    res.status(201).json(created);
  } catch (error) {
    if (error.code === "API_KEY_ALIAS_CONFLICT") {
      return res.status(409).json({ error: error.message });
    }
    throw error;
  }
});

app.delete("/api/keys/:id", requireSession, (req, res) => {
  const result = db.prepare(`
    UPDATE api_keys
    SET revoked_at = ?
    WHERE id = ? AND user_id = ? AND revoked_at IS NULL
  `).run(isoNow(), req.params.id, req.user.id);
  res.json({ ok: result.changes > 0 });
});

app.get("/api/admin/overview", requireSession, requireAdmin, (req, res) => {
  const users = db.prepare(`${userSelect} ORDER BY created_at DESC`).all().map(publicUser);
  const today = isoNow().slice(0, 10);
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS requestCount,
      SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) AS successCount,
      SUM(cost) AS totalCost,
      COALESCE(SUM(CASE WHEN usage_date = ? THEN cost ELSE 0 END), 0) AS todayCost,
      SUM(prompt_token_count) AS promptTokenCount,
      SUM(cached_content_token_count) AS cachedContentTokenCount,
      SUM(thoughts_token_count) AS thoughtsTokenCount,
      SUM(candidates_token_count) AS candidatesTokenCount,
      SUM(billable_character_count) AS billableCharacterCount
    FROM usage_records
  `).get(today);

  res.json({
    users,
    provider: getProviderConfig(),
    pricing: listPricing(),
    dailyStats: adminDailyStats(),
    dailyModelStats: adminDailyModelStats(),
    modelStats: adminModelStats(),
    totals,
  });
});

app.post("/api/admin/provider", requireSession, requireAdmin, (req, res) => {
  try {
    const config = normalizeProviderConfig(req.body);
    createGoogleGenAIClient(config);
    saveProviderConfig(config);
    res.json({ provider: getProviderConfig() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/admin/provider", requireSession, requireAdmin, (req, res) => {
  clearProviderConfig();
  res.json({ provider: getProviderConfig() });
});

app.post("/api/admin/pricing", requireSession, requireAdmin, (req, res) => {
  if (!String(req.body?.modelId || "").trim()) {
    return res.status(400).json({ error: "modelId is required" });
  }
  try {
    const row = createPricing({
      modelId: String(req.body.modelId).trim(),
      inputPrice: req.body.inputPrice,
      outputPrice: req.body.outputPrice,
      cachePrice: req.body.cachePrice,
      embeddingInputPrice: req.body.embeddingInputPrice,
    });
    res.status(201).json({ pricing: listPricing(), row });
  } catch (error) {
    if (error.code === "PRICING_MODEL_CONFLICT") {
      return res.status(409).json({ error: error.message });
    }
    throw error;
  }
});

app.delete("/api/admin/pricing/:id", requireSession, requireAdmin, (req, res) => {
  deletePricing(req.params.id);
  res.json({ pricing: listPricing() });
});

app.patch("/api/admin/users/:id/balance", requireSession, requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const ts = isoNow();
  if (Number.isFinite(Number(req.body?.delta))) {
    db.prepare("UPDATE users SET balance = balance + ?, updated_at = ? WHERE id = ?")
      .run(Number(req.body.delta), ts, userId);
  } else if (Number.isFinite(Number(req.body?.balance))) {
    db.prepare("UPDATE users SET balance = ?, updated_at = ? WHERE id = ?")
      .run(Number(req.body.balance), ts, userId);
  } else {
    return res.status(400).json({ error: "balance or delta is required" });
  }

  const user = db.prepare(`${userSelect} WHERE id = ?`).get(userId);
  res.json({ user: publicUser(user), users: db.prepare(`${userSelect} ORDER BY created_at DESC`).all().map(publicUser) });
});

app.delete("/api/admin/users/:id", requireSession, requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) return res.status(400).json({ error: "Invalid user id" });
  if (userId === req.user.id) return res.status(400).json({ error: "Cannot delete the current admin user" });

  const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!existing) return res.status(404).json({ error: "User not found" });

  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  res.json({ users: db.prepare(`${userSelect} ORDER BY created_at DESC`).all().map(publicUser) });
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

if (isProduction) {
  const distDir = path.join(process.cwd(), "dist");
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^\/(?!api\/).*/, (req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use(/^\/(?!api\/).*/, async (req, res, next) => {
    try {
      const template = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error);
      next(error);
    }
  });
}

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({ error: error.message || "Internal server error" });
});

app.listen(port, () => {
  console.log(`Ema Powerbank listening on http://localhost:${port}`);
});
