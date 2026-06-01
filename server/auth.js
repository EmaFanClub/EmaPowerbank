import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { db, isoNow, publicUser } from "./db.js";

const COOKIE_NAME = "relay_session";
const JWT_SECRET = process.env.JWT_SECRET || "development-only-change-me";

export function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signSession(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function requireSession(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub);
    if (!row) return res.status(401).json({ error: "Invalid session" });
    req.user = row;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  return next();
}

export function sanitizeUser(row) {
  return publicUser(row);
}

export function generateApiKey() {
  return `ep_${crypto.randomBytes(32).toString("base64url")}`;
}

export function hashApiKey(apiKey) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

export function createApiKey(userId, name) {
  const normalizedName = String(name || "Default key").trim() || "Default key";
  const existing = db.prepare(`
    SELECT id FROM api_keys
    WHERE user_id = ? AND name = ? AND revoked_at IS NULL
    LIMIT 1
  `).get(userId, normalizedName);
  if (existing) {
    const error = new Error("API key alias already exists");
    error.code = "API_KEY_ALIAS_CONFLICT";
    throw error;
  }

  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);
  const keyPrefix = apiKey.slice(0, 12);
  const ts = isoNow();

  const result = db.prepare(`
    INSERT INTO api_keys (user_id, name, key_value, key_hash, key_prefix, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, normalizedName, apiKey, keyHash, keyPrefix, ts);

  return {
    id: result.lastInsertRowid,
    name: normalizedName,
    key: apiKey,
    keyPrefix,
    createdAt: ts,
  };
}

export function findApiKey(apiKey) {
  if (!apiKey) return null;
  const keyHash = hashApiKey(apiKey);
  return db.prepare(`
    SELECT
      api_keys.*,
      users.username,
      users.balance,
      users.role
    FROM api_keys
    JOIN users ON users.id = api_keys.user_id
    WHERE api_keys.key_hash = ? AND api_keys.revoked_at IS NULL
  `).get(keyHash);
}

export function touchApiKey(id) {
  db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").run(isoNow(), id);
}

export function listUserApiKeys(userId) {
  return db.prepare(`
    SELECT id, name, key_value, key_prefix, created_at, last_used_at, revoked_at
    FROM api_keys
    WHERE user_id = ? AND revoked_at IS NULL
    ORDER BY created_at DESC
  `).all(userId).map((row) => ({
    id: row.id,
    name: row.name,
    key: row.key_value,
    keyPrefix: row.key_prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  }));
}
