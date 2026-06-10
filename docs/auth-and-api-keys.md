# 认证与 API Key

本文说明用户注册登录、session 和 relay API key 的设计。

## 用户注册与登录

应用支持用户名和密码注册登录。

- 注册接口：`POST /api/auth/register`
- 登录接口：`POST /api/auth/login`
- 退出接口：`POST /api/auth/logout`
- 当前 session：`GET /api/session`

用户名规则：

- 3 到 32 个字符
- 只允许英文字母、数字、下划线和短横线

密码规则：

- 最少 8 个字符
- 后端使用 `bcrypt` 保存密码哈希

首次启动时，如果数据库中不存在管理员，会自动创建默认管理员：

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123456
```

生产环境必须修改默认管理员密码，并设置强 `JWT_SECRET`。

## Session Cookie

登录成功后，后端签发 `relay_session` cookie。

cookie 属性：

- `httpOnly: true`
- `sameSite: "lax"`
- `path: "/"`
- `maxAge: 7 天`
- `secure` 默认由 `NODE_ENV` 推导，生产环境为 `true`

可以通过 `SESSION_COOKIE_SECURE` 显式覆盖 `secure`。如果生产环境通过纯 HTTP 访问，需要设置：

```bash
export SESSION_COOKIE_SECURE=false
```

否则浏览器会拒收带 `Secure` 属性的 cookie，登录后会表现为未认证。

## 页面权限

前端根据当前用户角色生成导航：

- 普通用户：面板、日志、反馈
- 管理员：面板、管理、日志、反馈、反馈审核

后端权限仍是最终边界：

- `requireSession` 检查登录状态
- `requireAdmin` 检查管理员角色
- 管理接口全部要求管理员

## 用户 API Key

用户登录后可以创建自己的 relay API key。

- 创建接口：`POST /api/keys`
- 删除接口：`DELETE /api/keys/:id`
- key 前缀：`ep_`
- key 别名在同一用户下不能和未撤销 key 重复
- 删除 key 实际是写入 `revoked_at`，不会物理删除记录

API key 保存策略：

- 后端生成完整 key 后返回给用户
- `key_hash` 保存 SHA-256 哈希，用于请求鉴权
- `key_prefix` 保存前缀，方便列表展示
- `key_value` 保存新 key 明文，方便用户复制

旧 key 如果只有哈希没有 `key_value`，前端无法显示完整值，用户需要新建 key 后复制。

## Gemini 透传认证方式

调用 Gemini 透传接口时，客户端可以通过以下方式提供 relay API key：

- `x-goog-api-key: ep_xxx`
- `x-api-key: ep_xxx`
- `Authorization: Bearer ep_xxx`
- URL query：`?key=ep_xxx`

推荐使用 header，避免 key 出现在浏览器历史或普通访问日志中。

## 鉴权流程

1. 透传中间件从 header、Bearer token 或 query 中提取 `ep_` key。
2. 后端对 key 做 SHA-256 哈希。
3. 在 `api_keys` 表中查找未撤销记录，并关联用户。
4. key 不存在或已撤销时返回 `401 Invalid relay API key`。
5. 请求成功进入上游转发后，后端会更新该 key 的 `last_used_at`。

## 安全注意事项

- 生产环境必须设置强 `JWT_SECRET`。
- 不要把 `data/relay.sqlite` 暴露给公网。
- 不要把用户 API key 写入前端源码或公开文档。
- 推荐在 HTTPS 后使用服务，避免 cookie 和 API key 在明文网络中传输。
- 请求审计日志会脱敏认证 header，但请求体仍可能包含敏感数据，需要限制 `request-logs/` 权限。
