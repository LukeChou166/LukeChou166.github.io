# GitHub API 反代部署指南（Cloudflare Worker）

解决编辑器「网络请求失败（已自动重试仍不通）」：你的网络直连
`api.github.com` 被持续阻断，用自己部署的 Cloudflare Worker 做透明转发。

token 只会经过：你的浏览器 → 你自己的 Worker → GitHub，**不经任何第三方**。

## 部署步骤（面板方式，约 5 分钟）

1. 注册/登录 [Cloudflare](https://dash.cloudflare.com/)（免费套餐够用）
2. 左侧 **Workers & Pages** → **Create** → **Create Worker** → 名字随意
   （如 `gh-api-proxy`）→ **Deploy**
3. 点 **Edit code**，把本目录 `worker.js` 的全部内容粘贴进去覆盖默认代码
4. **Deploy** 保存。得到地址：`https://<你的子域>.workers.dev`

## 在编辑器中使用

1. 打开站点，点右下角「所有者登录」
2. 在「API 地址（可选）」输入框填：`https://<你的子域>.workers.dev`
3. 输入 PAT → 确认身份 → 正常编辑保存
4. 该地址存在本浏览器 localStorage（`reader:gh-api-base`），清空该输入框
   保存即恢复直连官方

## 验证反代是否通了

浏览器访问 `https://<你的子域>.workers.dev/rate_limit`，看到 JSON
（含 `rate.limit` 字段）即通。或：

```bash
curl "https://<你的子域>.workers.dev/rate_limit" \
  -H "Authorization: Bearer <你的PAT>"
```

## 注意

- `*.workers.dev` 域名在国内**也可能被阻断**。如果 Worker 部署后仍不通，
  在 Cloudflare 给 Worker 绑定一个自己的域名（Worker → Settings →
  Domains & Routes → Add Custom Domain，域名需已托管在 Cloudflare），
  然后填自定义域名
- Worker 免费额度：10 万次请求/天，编辑器场景绰绰有余
- 加固（可选）：Cloudflare 后台给 Worker 加 Access 策略，或把
  `worker.js` 中 `Access-Control-Allow-Origin` 的 `*` 改为
  `https://lukechou166.github.io`
