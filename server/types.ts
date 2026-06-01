import type { Request } from "express";

export type Role = "admin" | "user";
export type ProviderMode = "ai_studio" | "vertex";
export type JsonRecord = Record<string, any>;

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: number;
  username: string;
  role: Role;
  balance: number;
  createdAt: string;
}

export interface ApiKeyRow {
  id: number;
  user_id: number;
  name: string;
  key_value: string | null;
  key_hash: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  username?: string;
  balance: number;
  role: Role;
}

export interface PublicApiKey {
  id: number;
  name: string;
  key: string | null;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface PricingRow {
  id: number;
  model_id: string;
  input_price: number;
  output_price: number;
  cache_price: number;
  embedding_input_price: number;
  created_at: string;
  updated_at: string;
}

export interface PricingDto {
  id: number;
  modelId: string;
  inputPrice: number;
  outputPrice: number;
  cachePrice: number;
  embeddingInputPrice: number;
  updatedAt: string;
}

export interface PricingPayload {
  modelId: string;
  inputPrice?: string | number;
  outputPrice?: string | number;
  cachePrice?: string | number;
  embeddingInputPrice?: string | number;
}

export interface ProviderConfig {
  mode: ProviderMode;
  key: string;
  location: string;
  projectId: string;
  updatedAt?: string;
}

export interface ProviderPublicConfig {
  mode: ProviderMode;
  location: string;
  projectId: string;
  configured: boolean;
  keyPreview: string;
  updatedAt?: string;
}

export interface UsageCounts {
  cachedContentTokenCount: number;
  promptTokenCount: number;
  thoughtsTokenCount: number;
  candidatesTokenCount: number;
  billableCharacterCount: number;
}

export interface AggregateUsageRow extends UsageCounts {
  date?: string;
  modelId?: string;
  requestCount: number;
  successCount: number;
  cost: number;
  cachedCost: number;
  uncachedCost: number;
  outputCost: number;
  embeddingCost: number;
}

export interface RecordUsageInput {
  userId: number;
  apiKeyId: number | null;
  modelId: string;
  endpoint: string;
  requestPath: string;
  statusCode: number;
  usage: UsageCounts;
  cost: number;
  auditFile: string;
}

export interface HttpError extends Error {
  status?: number;
  code?: string;
}

export type AuthedRequest = Request & {
  user: UserRow;
};
