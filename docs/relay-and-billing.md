# Gemini 透传与计费

本文说明 `/api/v1*` Gemini REST 透传、上游适配、用量提取和扣费规则。

## 透传范围

所有匹配 `/api/v1*` 的请求会进入 Gemini 透传中间件，例如：

- `/api/v1beta/models/{model}:generateContent`
- `/api/v1beta/models/{model}:streamGenerateContent`
- `/api/v1beta/models/{model}:batchEmbedContents`

客户端保持 Gemini REST 请求形状不变，只需要把 Base URL 改为：

```text
http://localhost:8787/api
```

本项目不转换 OpenAI 协议，也不修改普通 Gemini 请求语义。

## 上游模式

管理员必须配置一个上游 provider。

### AI Studio

AI Studio 模式使用字符串 API Key。

请求处理：

1. 去掉本服务的 `/api` 前缀。
2. 删除客户端 query 中的 `key` 和 `api_key`。
3. 将管理员配置的上游 key 写入上游 query `key`。
4. 转发到 `https://generativelanguage.googleapis.com`。

### Vertex AI

Vertex 模式使用服务账号 JSON 和 location。

请求处理：

1. 从服务账号 JSON 中读取 `project_id`。
2. 使用服务账号获取 access token。
3. 将 `/v1beta/models/{model}:...` 映射到 Vertex publisher model 路径。
4. location 为 `global` 时使用 `aiplatform.googleapis.com`，否则使用 `${location}-aiplatform.googleapis.com`。
5. 上游请求使用 `Authorization: Bearer <token>`。

## Vertex Embedding 兼容

Gemini API 和 Vertex AI embedding 的请求/响应形状不完全一致。对于 embedding batch 请求，后端会做兼容转换。

- `gemini-embedding-001` 和 text embedding 模型使用 Vertex `predict`
- 新的 Gemini embedding 模型和 MaaS 模型使用 Vertex `embedContent`
- Vertex 响应会转换回批量 embedding 形状

限制：

- `gemini-embedding-001` 在 Vertex 下只支持单条 content
- `embedContent` 类型也只支持单条 content
- 如果批量请求中共享参数冲突，后端会返回 400

## 透传请求流

1. 提取 relay API key 并验证。
2. 读取上游配置，未配置时返回 `503 Upstream provider is not configured`。
3. 从路径中解析模型 ID。
4. 如果模型有非零价格且用户余额小于等于 `0`，返回 `402 Insufficient balance`。
5. 构造上游 URL 和 header。
6. Vertex 模式获取 access token。
7. 必要时转换 Vertex embedding 请求体。
8. 调用上游。
9. 将上游状态码和主要响应 header 透传给客户端。
10. 普通响应边读上游 body 边写给客户端；embedding 兼容响应会先完整读取再转换。
11. 提取响应用量，计算费用。
12. 写入 `request-logs/` 审计 JSON。
13. 写入 `usage_records`，费用大于 0 时扣减用户余额。
14. 更新 API key 的 `last_used_at`。

## 用量提取

后端从普通 JSON 响应或 SSE 流式响应的 `data:` 行中提取用量。

支持字段：

- `cachedContentTokenCount`
- `promptTokenCount`
- `thoughtsTokenCount`
- `candidatesTokenCount`
- `billableCharacterCount`

也兼容部分 snake_case 字段。

## 计费规则

价格单位是每 1M tokens 或 characters。

| 分项 | 计算方式 |
| --- | --- |
| 未缓存输入 | `promptTokenCount - cachedContentTokenCount` |
| 输出 | `thoughtsTokenCount + candidatesTokenCount` |
| 缓存输入 | `cachedContentTokenCount` |
| 嵌入 | `billableCharacterCount` |

只有上游返回 `2xx` 时才扣费。上游错误、未配置价格或价格为 `0` 的模型不会扣费。

## Embedding 用量归一化

Embedding 模型统一归到嵌入字段。

如果上游没有返回 `billableCharacterCount`，后端会使用 prompt/thoughts/candidates token 兜底作为 embedding 用量，并把普通输入/输出 token 清零，避免 embedding 请求污染普通 token 统计。

## 默认价格

首次启动会写入默认价格：

| 模型 | 未缓存输入 | 输出 | 缓存输入 | 嵌入 |
| --- | ---: | ---: | ---: | ---: |
| `gemini-3.5-flash` | `$1.50/M` | `$9.00/M` | `$0.15/M` | `-` |
| `gemini-3.1-pro-preview` | `$2.00/M` | `$12.00/M` | `$0.20/M` | `-` |
| `gemini-embedding-001` | `-` | `-` | `-` | `$0.15/M` |
| `gemini-embedding-2` | `-` | `-` | `-` | `$0.20/M` |

管理员可以新增或删除价格。同一个模型 ID 不能重复新增。价格为空或 `0` 的分项会被视为不可用。
