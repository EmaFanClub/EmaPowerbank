import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { CookieOptions, NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { db, isoNow, publicUser } from "./db.js";
import type { ApiKeyRow, HttpError, PublicApiKey, UserRow } from "./types.js";

const COOKIE_NAME = "relay_session";
const JWT_SECRET = process.env.JWT_SECRET || "development-only-change-me";

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function sessionCookieBaseOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: parseBooleanEnv(process.env.SESSION_COOKIE_SECURE, process.env.NODE_ENV === "production"),
    path: "/",
  };
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSession(user: Pick<UserRow, "id" | "role">) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    ...sessionCookieBaseOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, sessionCookieBaseOptions());
}

export function requireSession(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub) as UserRow | undefined;
    if (!row) return res.status(401).json({ error: "Invalid session" });
    req.user = row;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  return next();
}

export function sanitizeUser(row: UserRow | undefined) {
  return publicUser(row);
}

export function generateApiKey() {
  return `ep_${crypto.randomBytes(32).toString("base64url")}`;
}

export function hashApiKey(apiKey: string) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

export function createApiKey(userId: number, name: string | undefined) {
  const normalizedName = String(name || "Default key").trim() || "Default key";
  const existing = db.prepare(`
    SELECT id FROM api_keys
    WHERE user_id = ? AND name = ? AND revoked_at IS NULL
    LIMIT 1
  `).get(userId, normalizedName) as { id: number } | undefined;
  if (existing) {
    const error = new Error("API key alias already exists") as HttpError;
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
    id: Number(result.lastInsertRowid),
    name: normalizedName,
    key: apiKey,
    keyPrefix,
    createdAt: ts,
  };
}

export function findApiKey(apiKey: string): ApiKeyRow | null {
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
  `).get(keyHash) as ApiKeyRow | undefined ?? null;
}

export function touchApiKey(id: number) {
  db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").run(isoNow(), id);
}

export function listUserApiKeys(userId: number): PublicApiKey[] {
  return (db.prepare(`
    SELECT id, name, key_value, key_prefix, created_at, last_used_at, revoked_at
    FROM api_keys
    WHERE user_id = ? AND revoked_at IS NULL
    ORDER BY created_at DESC
  `).all(userId) as ApiKeyRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    key: row.key_value,
    keyPrefix: row.key_prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  }));
}
