import { GoogleGenAI } from "@google/genai";
import { GoogleAuth } from "google-auth-library";
import type { JsonRecord, ProviderConfig } from "./types";

const CLOUD_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

type VertexCredentials = JsonRecord & {
  project_id: string;
  client_email?: string;
};

let cachedAuth: { cacheKey: string; client: any } | null = null;

export function parseVertexCredentials(key: string): VertexCredentials {
  const credentials = JSON.parse(key) as VertexCredentials;
  if (!credentials.project_id) {
    throw new Error("Vertex service account JSON must include project_id");
  }
  return credentials;
}

export function createGoogleGenAIClient(config: ProviderConfig, httpOptions: JsonRecord = {}) {
  const key = config.key;

  if (config.mode === "vertex") {
    const credentials = parseVertexCredentials(key);
    const googleAuthOptions = {
      credentials,
      scopes: [CLOUD_SCOPE],
    };
    return new GoogleGenAI({
      vertexai: true,
      location: config.location || "global",
      project: credentials.project_id,
      googleAuthOptions,
      httpOptions,
    } as any);
  }

  return new GoogleGenAI({
    apiKey: key,
    httpOptions,
  });
}

export async function getVertexAccessToken(config: ProviderConfig) {
  const credentials = parseVertexCredentials(config.key);
  const cacheKey = `${credentials.client_email}:${config.location || "global"}`;

  if (!cachedAuth || cachedAuth.cacheKey !== cacheKey) {
    const auth = new GoogleAuth({
      credentials,
      scopes: [CLOUD_SCOPE],
    });
    cachedAuth = {
      cacheKey,
      client: await auth.getClient(),
    };
  }

  const result = await cachedAuth.client.getAccessToken();
  if (!result?.token) throw new Error("Unable to obtain Vertex access token");
  return result.token;
}

export function normalizeProviderConfig(payload: JsonRecord): ProviderConfig {
  const mode = payload.mode === "vertex" ? "vertex" : "ai_studio";
  const key = String(payload.key || "").trim();
  let location = "";
  let projectId = "";

  if (!key) throw new Error("Provider key is required");

  if (mode === "vertex") {
    location = String(payload.location || "global").trim() || "global";
    const credentials = parseVertexCredentials(key);
    projectId = credentials.project_id;
  }

  return { mode, key, location, projectId };
}
