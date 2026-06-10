# 请求日志

本文说明请求日志列表、详情、审计文件和权限边界。

## 记录范围

所有通过 `/api/v1*` 进入 Gemini 透传的请求都会记录：

- 请求成功
- 上游返回错误
- Relay 内部处理错误

日志分为两层：

- `usage_records`：SQLite 中的列表索引和统计字段
- `request-logs/`：完整 JSON 审计文件

## 列表接口

普通用户：

- `GET /api/request-logs`
- `GET /api/request-logs/:id`

管理员：

- `GET /api/admin/request-logs`
- `GET /api/admin/request-logs/:id`

普通用户只能查看自己的日志。管理员可以查看全部日志，并按 `userId` 筛选。

## 筛选和分页

列表接口支持：

- `startTime`
- `endTime`
- `startDate` 或 `from`
- `endDate` 或 `to`
- `page`
- 管理员额外支持 `userId`

列表每页 20 条。排序规则是 `created_at DESC, id DESC`。

## 列表字段

列表页主要读取 `usage_records`，不会扫描所有 JSON 文件。

每条日志包含：

- 用户和用户名
- API key id 和 key 前缀
- 模型 ID
- 请求方法和路径
- 使用日期
- 状态码
- cached/input/output/embedding 用量
- 费用
- 总耗时
- 分段耗时
- 审计文件名
- 创建时间

## 详情读取

展开某条日志时，后端会：

1. 根据日志 id 查询 `usage_records`。
2. 检查当前用户权限。
3. 解析并校验 `audit_file` 是否仍在 `request-logs/` 目录内。
4. 读取对应 JSON 文件。
5. 返回 JSON 详情；如果文件不是 JSON，则返回 raw 文本。

如果数据库记录存在但文件已删除，列表仍会显示该记录，详情接口返回：

```text
404 Request log file not found
```

## 审计文件内容

每个审计 JSON 包含：

- `timestamp`
- `userId`
- `apiKeyId`
- provider 模式、location、projectId
- 已脱敏的上游 URL
- 请求 method、path、headers、body
- 响应 statusCode、body、error
- billing usage 和 cost
- timing 总耗时和分段耗时

认证相关 header 会脱敏：

- `authorization`
- `cookie`
- `x-api-key`
- `x-goog-api-key`

AI Studio 上游 URL 中的 `key` query 也会脱敏。

## 耗时分段

后端会记录主要阶段耗时，例如：

- `preflightMs`
- `upstreamSetupMs`
- `vertexAccessTokenMs`
- `requestTransformMs`
- `upstreamHeadersMs`
- `upstreamBodyMs`
- `responseTransformMs`
- `downstreamResponseMs`
- `usageBillingMs`
- `auditLogMs`
- `errorHandlingMs`

前端日志详情会展示总耗时和分段耗时，用于排查慢请求。

## 运维注意

请求体和响应体会原样保存，可能包含用户输入、模型输出或业务敏感数据。

生产环境建议：

- 限制 `request-logs/` 目录权限
- 制定清理、归档和备份策略
- 不要把 `request-logs/` 提交到代码仓库
- 如果清理 JSON 文件，需要接受列表记录仍存在但详情返回 404 的行为
