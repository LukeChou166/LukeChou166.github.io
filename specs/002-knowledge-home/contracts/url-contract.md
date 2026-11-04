# Contract: URL / 路由契约

Feature: 002-knowledge-home | Date: 2026-11-04

## URL 空间分配（在 001 契约基础上修订）

| 路径 | 归属 | 变化 |
|---|---|---|
| `/` | **阅读器首页** | 新：知识分享阅读器（原博客列表页移除） |
| `#/<book>/<chapter>.md` | 阅读器 hash 路由 | 新：定位书籍与章节 |
| `/posts/` | 博客文章列表 | 不变（承接原首页内容） |
| `/posts/<slug>/` `/archives/` `/tags/` `/about/` `/search/` | 新站博客 | 不变 |
| `/book/` | **兼容跳转页** | 变：Docsify 壳 → meta-refresh 跳转 `/#/claude-code-book/README.md` |
| `/book/<slug>/…` | 书籍文件区 | 变：原 `book/*` 平铺内容迁入 `book/claude-code-book/`；旧书内 hash 深链经保留的 `book/claude-code-book/index.html` 仍可达 |
| `/legacy/…` | 历史站 | 不变（只读） |
| `/404.html` | 兜底页 | 不变 |

## 导航契约

```text
首页(=知识分享)  ·  文章(/posts/)  ·  归档  ·  标签  ·  关于  ·  历史版本(/legacy/)
```

- 「首页」即阅读器；博客内容经「文章」「归档」进入
- Header 中的「知识分享」独立入口保留，指向 `/`（或书架锚点），与首页语义一致

## 规则

- C-1: 阅读器只消费 `/book/<slug>/` 下的静态文件（fetch），不占用新路径
- C-2: `.md` 文件 MUST 以原始文件形式被服务（Content-Type 由 Pages 决定），
  「查看源文件」直接链接该路径
- C-3: 章节 md 内部相对链接解析基准为 `/book/<slug>/`；站内章节链接
  （同书 `.md`）在渲染层拦截并转成阅读器内路由
- C-4: 根路径产物仍由 `site-src` 构建生成；`book/` 内容不在 Astro 构建范围内，
  由 subtree 同步直接上线（保证 FR-007）

## 验收

- 抽查 `/#/claude-code-book/01-architecture-overview.md` 刷新后位置保持
- `/book/` 返回的 HTML 含跳转到首页阅读器的 meta refresh
- `/book/claude-code-book/01-architecture-overview.md` 直接可访问（源文件视图）
