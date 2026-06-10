# 管理员控制台

本文说明管理员页面和相关后端能力。

## 入口和权限

管理员登录后，侧边栏会显示：

- 面板
- 管理
- 日志
- 反馈
- 反馈审核

管理员接口都需要：

1. 已登录 session
2. 当前用户 `role = admin`

普通用户即使手动访问管理接口，也会收到 `403 Admin only`。

## 管理面板数据

管理面板通过 `GET /api/admin/overview` 加载。

响应包含：

- 全部用户及累计消费
- 当前上游 provider 公共信息
- 模型价格列表
- 全局每日统计
- 全局每日模型统计
- 全局模型统计
- 全局总量统计

全局统计包括：

- 累计费用
- 今日花费
- 请求数
- 请求成功率
- 累计 Token 数
- 缓存命中率
- cached/input/output/embedding 用量和费用分项

## 上游配置

配置接口：

- `POST /api/admin/provider`
- `DELETE /api/admin/provider`

支持两种模式：

### AI Studio

必填：

- API Key

不需要 location。

### Vertex AI

必填：

- Location，常用 `global`
- 服务账号 JSON

服务账号 JSON 必须包含 `project_id`，且服务账号需要有调用 Vertex AI Gemini 模型的权限。

保存前，后端会规范化配置并尝试创建 Google GenAI client，以便尽早发现格式错误。

上游密钥会保存在 SQLite `settings` 表中。返回给前端时只暴露脱敏预览、模式、location、projectId 和更新时间。

## 模型计费

接口：

- `POST /api/admin/pricing`
- `DELETE /api/admin/pricing/:id`

价格字段：

- `inputPrice`：未缓存输入价格
- `outputPrice`：输出价格
- `cachePrice`：缓存输入价格
- `embeddingInputPrice`：嵌入价格

规则：

- 价格单位是每 1M tokens 或 characters
- 同一个模型 ID 只能存在一条价格记录
- 空值或 `0` 表示该分项不可用
- 删除价格后，历史用量记录仍保留；后续聚合费用分项会按当前价格表关联显示

默认价格由 `server/db.ts` 在首次启动或 seed 版本变化时写入。

## 用户管理

管理员可以：

- 查看所有用户
- 查看用户余额
- 查看用户累计消费
- 调整用户余额
- 删除用户

余额接口：

```text
PATCH /api/admin/users/:id/balance
```

请求体支持两种方式：

- `{ "balance": 10 }`：直接设置余额
- `{ "delta": 5 }`：在现有余额上增减

删除接口：

```text
DELETE /api/admin/users/:id
```

限制：

- 不能删除当前登录管理员
- 删除用户会通过外键级联删除该用户 API key
- 相关 `usage_records` 会按外键规则处理

## 请求日志管理

管理员可以打开“日志”查看所有用户的请求日志，并按用户和时间筛选。详情见 [请求日志](request-logs.md)。

## 反馈审核

管理员可以打开“反馈审核”处理用户问题反馈。详情见 [反馈功能](feedback.md)。

## 操作确认

前端对高风险操作使用确认：

- 保存上游配置
- 清空上游配置
- 新增/删除模型价格
- 保存余额
- 删除用户
- 通过或拒绝反馈

这些确认是前端交互保护，后端权限校验仍是最终边界。
