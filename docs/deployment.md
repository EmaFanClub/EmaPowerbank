# 部署与维护

本文说明运行、部署、运行时目录、备份清理和验证命令。

## 本地开发

```bash
npm install
npm run dev
```

默认地址：

```text
http://localhost:8787
```

开发模式下 Express 会加载 Vite middleware，前端和后端共用同一个端口。

## 生产构建

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

构建产物：

- `dist/`：前端静态资源
- `dist-server/`：编译后的后端

如果运行镜像中已经有构建产物，可以在构建后裁剪 devDependencies：

```bash
npm prune --omit=dev
```

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `8787` | Web 服务端口 |
| `NODE_ENV` | `development` | 设为 `production` 后服务 `dist/` |
| `JWT_SECRET` | `development-only-change-me` | session 签名密钥，生产环境必须设置 |
| `SESSION_COOKIE_SECURE` | 按 `NODE_ENV` 推导 | 覆盖 session cookie 是否带 `Secure` |
| `ADMIN_USERNAME` | `admin` | 首次初始化管理员用户名 |
| `ADMIN_PASSWORD` | `admin123456` | 首次初始化管理员密码 |

生产示例：

```bash
export JWT_SECRET="replace-with-a-long-random-secret"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="replace-with-a-strong-password"
export PORT=8787

npm ci
npm run build
NODE_ENV=production npm start
```

如果生产环境只能通过纯 HTTP 访问，需要设置：

```bash
export SESSION_COOKIE_SECURE=false
```

## 运行时目录

启动时会自动创建：

```text
data/
request-logs/
feedback/
```

用途：

- `data/relay.sqlite`：SQLite 数据库
- `request-logs/`：透传请求完整审计 JSON
- `feedback/`：反馈包、反馈 JSON 和附件

这些目录都是运行时数据，已经加入 `.gitignore`。

## 反向代理建议

如果部署在 Nginx、Caddy、Traefik 或其他反向代理后面，需要注意：

- 使用 HTTPS
- 转发 WebSocket 或长连接不是必须，但需要允许长响应
- 请求体大小要覆盖模型请求和反馈上传
- 透传请求 body 限制是 50 MB
- 反馈上传 body 限制是 55 MB
- 超时设置要适合长模型响应

## 备份和清理

建议备份：

- `data/relay.sqlite`
- 必要时备份 `feedback/`

按需清理：

- `request-logs/` 可能快速增长，需要归档或清理
- `feedback/` 可能包含用户上传图片，需要归档或清理

注意：

- 删除 `request-logs/` 中的 JSON 文件后，日志列表仍可能显示数据库记录，但展开详情会返回 404
- 删除 `feedback/` 中的文件会影响反馈审核和附件查看
- 不要把运行时目录提交到代码仓库

## 文件权限

生产环境至少应限制：

- `data/`
- `request-logs/`
- `feedback/`

这些目录可能包含：

- 用户密码哈希
- 上游 API key 或服务账号 JSON
- 用户请求体和响应体
- 用户上传图片
- 用户反馈内容

## 验证命令

类型检查：

```bash
npm run typecheck
```

构建检查：

```bash
npm run build
```

构建后 smoke test：

```bash
npm run smoke
```

健康检查：

```bash
curl http://localhost:8787/api/health
```

返回示例：

```json
{
  "ok": true,
  "time": "2026-06-01T17:44:56.974Z"
}
```

## 发布前检查

发布前建议确认：

- `npm run typecheck` 通过
- `npm run build` 通过
- `npm run smoke` 通过
- 已设置强 `JWT_SECRET`
- 已修改默认管理员密码
- 上游 provider 已配置
- 运行时目录权限正确
- 备份策略已确认
