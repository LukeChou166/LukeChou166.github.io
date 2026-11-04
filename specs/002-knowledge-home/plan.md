# Implementation Plan: 首页即知识分享（多书阅读器）

**Branch**: `002-knowledge-home` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-knowledge-home/spec.md`

## Summary

将新站首页 `/` 从博客文章列表改为「知识分享」多书阅读器：左侧目录（由各书的
`SUMMARY.md` 生成）、右侧章节内容（客户端渲染 Markdown），支持多本书切换
（`book/books.json` 清单驱动），章节支持 hash 路由与「查看源文件」直达原始 md。
书籍物理上位于 `book/<slug>/`，现有 claude-code-book subtree 迁入该结构，
内容更新无需重新构建站点。博客文章列表保留在 `/posts/`。

## Technical Context

**Language/Version**: Astro 5（现有 site-src 工程）+ TypeScript；Markdown 渲染
使用 npm 打包的 marked（或 markdown-it），无公共 CDN 依赖

**Primary Dependencies**: AstroPaper 主题（现有）、marked、原生 fetch（md 资源
已由 GitHub Pages 静态服务）；`book/books.json` 作为书籍清单

**Storage**: 无数据库；书籍 = `book/<slug>/` 目录（SUMMARY.md + 章节 md + 资源），
由 `.github/workflows/sync-book.yml` subtree 自动同步

**Testing**: 本地静态服务（根目录 `python3 -m http.server`）手动场景
（quickstart.md）+ `npm run build` 零错误 + 旧入口跳转抽查

**Target Platform**: GitHub Pages（静态托管，`404.html` 兜底）；桌面 + 移动端

**Project Type**: 静态站点（客户端渲染阅读器页面）

**Performance Goals**: 首页首屏（目录 + 默认章节渲染完成）< 2s（本地网络估算）；
渲染器随站点 bundle，无额外阻塞请求

**Constraints**: GitHub Pages 无服务端重写；书籍更新 MUST NOT 要求重新构建
（FR-007）→ 阅读器必须运行时 fetch md，不能构建期固化为 HTML；
`sync-book.yml` 的 subtree prefix 需从 `book` 迁到 `book/claude-code-book`，
外部仓库 claude-code-book 的 notify 工作流（发送 repository_dispatch）不在
本仓库内，需要仓库外部配合（NEEDS CLARIFICATION → 见 research.md R5，
提供降级路径：每小时定时兜底同步 + 一次性手动迁移提交）

**Scale/Scope**: 当前 1 本书 / 21 章节；设计目标 ≤ 10 本书，单书 ≤ 100 章节

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

依据 `.specify/memory/constitution.md` v1.0.0：

| 原则 | 评估 |
|---|---|
| I. 变更存档 | ✅ 走 spec 流程（本目录）；实现完成后将在 `doc/changes/` 补 feature 存档 |
| II. 静态优先 | ✅ 纯静态托管 + 客户端渲染；复用现成渲染库（marked），不自研解析器；无服务端/数据库 |
| III. 内容零丢失 | ✅ 书籍内容只迁移目录位置（book/ → book/<slug>/），文件零修改；`legacy/` 不触碰；`sync-book.yml` 同步修改保留 subtree 机制 |
| IV. 先验证后交付 | ✅ quickstart.md 定义验证场景；交付前按场景执行 |

**结论：PASS**（无门禁冲突；R5 中外部仓库工作流配合为外部依赖，不构成原则冲突）

## Project Structure

### Documentation (this feature)

```text
specs/002-knowledge-home/
├── plan.md              # 本文件
├── spec.md              # 需求规格
├── research.md          # Phase 0: 渲染方式/多书组织/兼容策略调研
├── data-model.md        # Phase 1: Book/Chapter/Reader 模型与状态
├── contracts/           # Phase 1: URL 与数据文件契约
│   ├── url-contract.md
│   └── books-json.md
└── quickstart.md        # Phase 1: 验证指南
```

### Source Code (repository root)

```text
site-src/
├── src/
│   ├── components/
│   │   ├── BookShelf.astro        # 书架/书籍切换
│   │   └── reader/
│   │       ├── Reader.astro       # 阅读器骨架（左目录右内容）
│   │       ├── Toc.astro          # SUMMARY.md → 目录
│   │       └── MarkdownPane.astro # 章节 md 渲染 + 「查看源文件」
│   ├── scripts/reader.ts          # fetch/render/hash 路由逻辑
│   ├── layouts/ReaderLayout.astro # 阅读器专用布局（覆盖默认首页）
│   └── pages/index.astro          # 首页改为阅读器（重写现有文件）
book/
├── books.json                     # 书籍清单（契约见 contracts/books-json.md）
├── claude-code-book/              # 现有 subtree 迁入（文件内容零修改）
│   ├── SUMMARY.md index.html *.md ...
└── <future-book>/                 # 后续书籍
.github/workflows/sync-book.yml    # prefix: book → book/claude-code-book
```

**Structure Decision**: 阅读器是 AstroPaper 主题内的一个定制首页（复用
Header/Footer/Layout 与暗色模式），渲染逻辑集中在 `scripts/reader.ts`；
书籍数据层只有两个来源——文件系统（book/<slug>/）与 books.json 清单，
不引入额外构建步骤。
