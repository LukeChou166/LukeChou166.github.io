# Bug 存档：编辑器「网络请求失败」— api.github.com 直连不稳定

日期：2026-11-07 ｜ 类型：**bug** ｜ 分支：`fix-editor-network`

## 用户原始 query

> 还是不行：无法获取远端文件信息：网络请求失败，请检查网络后重试
> 请检查访问凭据的仓库范围与权限（细粒度 PAT 需勾选本仓库 + Contents: Read and write），或稍后重试。 新建fix bug分支

## 根因分析

- 修复仓库名后错误从固定文案变为「网络请求失败」——即 `fetch` 直接抛异常
  （连接层失败），而非 401/403；
- 实测（`agent-browser` 真实浏览器 + 用户 token）：
  `GET /repos/LukeChou166/LukeChou166.github.io/contents/...` 返回 **HTTP 200**，
  CORS 正常——排除代码与凭据问题；
- 结论：**用户本地网络到 `api.github.com` 的直连被间歇性阻断**（国内典型现象），
  与"登录能成功、点编辑失败"的随机表现吻合（登录时通、稍后被重置）；
- 代码缺陷：原实现网络异常只重试 0 次，且无任何绕行手段。

## 修复方案

1. **自动重试**：`auth.ts` 新增 `fetchWithRetry`（仅对 fetch 抛异常重试 2 次，
   延迟 800ms/1600ms；HTTP 状态错误不重试；PUT 幂等——固定 sha，重复成功
   只是同一提交），`verifyToken`/`fetchRemoteMeta`/`saveFile` 全部接入；
2. **可配置 API 地址**：登录对话框新增可选「API 地址」输入（存
   `localStorage["reader:gh-api-base"]`，空 = 官方），所有者可填自建反代
   （如 Cloudflare Worker）彻底绕开直连阻断；`apiUrl()` 统一走该基址。

## 涉及文件与行号

- `site-src/src/scripts/reader/editor/auth.ts` — `getAPIBase`/`saveAPIBase`/
  `fetchWithRetry` 新增；`verifyToken` 接入
- `site-src/src/scripts/reader/editor/save.ts` — 两处 fetch 接入 `fetchWithRetry`，
  失败文案给出反代指引
- `site-src/src/scripts/reader/editor/editor.ts` — 登录对话框新增 API 地址输入
  （回填已配置值）
- `specs/003-online-book-editor/contracts/local-storage.md` — 新增键 `reader:gh-api-base`

## 验证命令与结果

```bash
# 排除凭据/CORS（agent-browser 真实浏览器）：
fetch('https://api.github.com/repos/LukeChou166/LukeChou166.github.io/contents/...',
      {headers:{Authorization:'Bearer <token>',...}})
# → "HTTP 200"（代码与凭据均正常，问题在网络环境）
cd site-src && npm run build   # → astro check 0 errors
```

## 用户侧后续动作

1. 推送本分支上线后重试（自动重试可能已足够应对间歇性阻断）；
2. 若仍频繁失败：自建一个 Cloudflare Worker 反代 `api.github.com`，把地址填入
   登录对话框的「API 地址」——token 只发给自己的反代，不经第三方；
3. 对话中暴露的 PAT 仍 MUST 撤销重建。
