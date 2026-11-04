# Contract: URL / 路由契约

Feature: 001-blog-redesign | Date: 2026-11-04

静态站点的对外"接口"即 URL 空间。本契约约束新站的路径分配，任何实现（Hugo/Hexo/Astro）都不得违反。

## URL 空间分配

| 前缀 | 归属 | 说明 |
|---|---|---|
| `/` | 新站 | 新主题首页 |
| `/posts/…`（或框架默认 slug 规则） | 新站 | 文章详情 |
| `/archives/` `/tags/` `/about/` | 新站 | 归档 / 标签 / 关于 |
| `/book/…` | book GitBook | 知识分享（保持现状不动） |
| `/legacy/…` | 历史站 | 旧 matery 站全量快照，资源自洽于 `/legacy/` 前缀 |
| `/legacy/book/…` | 兜底镜像 | book 的历史副本 |
| `/404.html` | 新站兜底页 | 必须含指向 `/legacy/` 的显式入口链接 |

## 导航契约（新站）

```text
首页 /  ·  归档  ·  知识分享  ·  关于  ·  历史版本
                                        └→ /legacy/
```

- 「历史版本」入口必须出现在桌面与移动端导航中
- `/legacy/` 页面内不再提供返回新站的强制引导（保持历史原貌）

## 兼容性规则

- C-1: 新站不得占用 `/legacy/`、`/book/` 路径
- C-2: 旧根路径 URL 不保证 301；由 404 页 + 站内搜索兜底（见 research.md R4）
- C-3: 归档站内所有静态资源引用必须以 `/legacy/` 开头（绝对路径）或相对路径，不得出现指向 `/css/`、`/medias/` 等根路径的残留引用
- C-4: 高价值旧文章如需直达跳转，在该旧路径放置单文件 meta-refresh 跳板（逐个手动添加，不做全量）

## 验收

- 抽查 `/legacy/index.html`、2 篇旧文章页、`/legacy/book/index.html`：页面 200，且其 HTML 中无 `href="/css/`、`src="/medias/` 等残留
- 新站页面与 `/book/`、`/legacy/` 互不干扰
