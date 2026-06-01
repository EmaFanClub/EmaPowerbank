import assert from "node:assert/strict";
import {
  calculateCost,
  extractModelFromPath,
  extractUsage,
  normalizeUsageForModel,
} from "./billing.js";
import { db, upsertPricing } from "./db.js";
import {
  stripApiPrefix,
  toVertexPathname,
  transformVertexEmbeddingBatchRequest,
  transformVertexEmbeddingBatchResponse,
} from "./proxy.js";

upsertPricing({
  modelId: "smoke-model",
  inputPrice: 1,
  outputPrice: 2,
  cachePrice: 0.5,
  embeddingInputPrice: 3,
});
upsertPricing({
  modelId: "smoke-embedding",
  inputPrice: 100,
  outputPrice: 100,
  cachePrice: 100,
  embeddingInputPrice: 3,
});

const usage = extractUsage(JSON.stringify({
  usageMetadata: {
    cachedContentTokenCount: 10,
    promptTokenCount: 110,
    thoughtsTokenCount: 20,
    candidatesTokenCount: 30,
  },
}));

assert.equal(usage.cachedContentTokenCount, 10);
assert.equal(usage.promptTokenCount, 110);
assert.equal(usage.thoughtsTokenCount, 20);
assert.equal(usage.candidatesTokenCount, 30);
assert.equal(calculateCost("smoke-model", usage), 0.000205);
assert.equal(calculateCost("smoke-embedding", { ...usage, billableCharacterCount: 1000 }), 0.003);
assert.deepEqual(
  normalizeUsageForModel("smoke-embedding", usage),
  {
    cachedContentTokenCount: 0,
    promptTokenCount: 0,
    thoughtsTokenCount: 0,
    candidatesTokenCount: 0,
    billableCharacterCount: 160,
  },
);
assert.equal(calculateCost("smoke-embedding", usage), 0.00048);
assert.equal(extractModelFromPath("/v1beta/models/gemini-3.5-flash:generateContent"), "gemini-3.5-flash");
assert.equal(extractModelFromPath("/api/v1beta/models/gemini-3.5-flash:generateContent"), "gemini-3.5-flash");
assert.equal(stripApiPrefix("/api/v1beta1/models/gemini-3.5-flash:generateContent"), "/v1beta1/models/gemini-3.5-flash:generateContent");
assert.equal(
  toVertexPathname("/v1beta/models/gemini-3.5-flash:generateContent", "p", "global"),
  "/v1beta1/projects/p/locations/global/publishers/google/models/gemini-3.5-flash:generateContent",
);
assert.equal(
  toVertexPathname("/v1beta/projects/p/locations/global/publishers/google/models/gemini-3.5-flash:generateContent", "p", "global"),
  "/v1beta1/projects/p/locations/global/publishers/google/models/gemini-3.5-flash:generateContent",
);
assert.equal(
  toVertexPathname("/v1beta/models/gemini-embedding-2:batchEmbedContents", "p", "global"),
  "/v1beta1/projects/p/locations/global/publishers/google/models/gemini-embedding-2:embedContent",
);
assert.deepEqual(
  JSON.parse(transformVertexEmbeddingBatchRequest(JSON.stringify({
    requests: [{
      model: "models/gemini-embedding-2",
      content: { role: "user", parts: [{ text: "hello" }] },
      outputDimensionality: 64,
    }],
  }))),
  {
    content: { role: "user", parts: [{ text: "hello" }] },
    embedContentConfig: { outputDimensionality: 64 },
  },
);
assert.deepEqual(
  JSON.parse(transformVertexEmbeddingBatchResponse(JSON.stringify({
    embedding: { values: [0.1] },
    usageMetadata: { promptTokenCount: 1 },
  }))).embeddings,
  [{ values: [0.1], statistics: { tokenCount: 1 } }],
);
assert.equal(
  extractModelFromPath("/v1/projects/p/locations/global/publishers/google/models/gemini-embedding-2:embedContent"),
  "gemini-embedding-2",
);

db.prepare("DELETE FROM pricing WHERE model_id = 'smoke-model'").run();
db.prepare("DELETE FROM pricing WHERE model_id = 'smoke-embedding'").run();
console.log("Smoke tests passed");
