<!--
=== Sync Impact Report ===
Version change: (unratified scaffold) → 1.0.0
Modified principles: none (initial ratification)
Added sections:
  - Principle I. 变更存档（Change Archival）— 来自用户治理要求：
    每次写完代码后必须写清 feature/bug 并存档；feature 须含
    背景、技术方案、变更文件、主要更改内容
  - Principle II. 静态优先（Static-First & Simplicity）
  - Principle III. 内容零丢失（Content Preservation）
  - Principle IV. 先验证后交付（Verify Before Ship）
  - Additional Constraints（GitHub Pages / 目录契约）
  - Development Workflow（spec 流程与发布步骤）
  - Governance
Removed sections: none
Deferred TODOs: none
===========================
-->

# 随笔博客（luluyouyue.github.io）Constitution

## Core Principles

### I. 变更存档（Change Archival）

每次代码变更完成后， MUST 输出一份变更记录并存档，未存档视为变更未完成。

- 记录 MUST 首先标明变更类型：**feature** 或 **bug**。
- **feature** 记录 MUST 包含四项内容：
  1. **背景**：为什么做这次变更（需求来源、要解决的问题）；
  2. **技术方案**：采取了什么方案、为什么选它（含被否决的备选）；
  3. **变更文件清单**：新增/修改/删除了哪些文件（含路径）；
  4. **主要更改内容**：每个关键文件改了什么、行为有何变化。
- **bug** 记录 MUST 包含：用户原始描述、根因分析、涉及文件与行号、修复方案、
  验证命令与结果。
- 存档位置：走 spec 流程的变更写入 `specs/<NNN-feature>/`（沿用
  plan.md/research.md 等既有产物）；未走 spec 的小型变更写入 `doc/changes/`
  下的单个 Markdown 文件，文件名使用简短的变更主题标识。
- 存档 MUST 使用 Markdown，路径用 `文件路径:行号` 引用代码位置。

**理由**：本仓库同时承载站点产物、源码工程与历史归档，目录关系复杂；
无存档的变更会让"哪些文件是产物、哪些是源码"迅速失控。

### II. 静态优先（Static-First & Simplicity）

站点 MUST 保持纯静态：不引入服务端运行时、数据库或需要维护的外部服务。
功能实现 MUST 优先复用成熟主题与现成工具（Astro/AstroPaper、pagefind、
Docsify），自研代码仅用于粘合。任何增加构建依赖或运行时组件的方案 MUST
在变更记录中说明理由并被证实更简单。

### III. 内容零丢失（Content Preservation）

任何改版、迁移、重构 MUST NOT 丢失已有内容：

- 旧版站点整体保存在 `legacy/`，视为只读快照，MUST NOT 直接修改其中文件；
- 文章正文 MUST 以 Markdown 原文迁移，MUST NOT 重写或删减正文；
- `book/` 知识分享由 GitHub Actions 自动同步（`sync-book.yml`），MUST NOT
  手动改动其内部文件。

### IV. 先验证后交付（Verify Before Ship）

交付前 MUST 完成并通过：

1. `cd site-src && npm run build`（含 astro check 与 pagefind 索引）零错误；
2. 本地静态服务（根目录 `python3 -m http.server`）抽查关键路径可达：
   `/`、至少一篇 `/posts/*`、`/legacy/`、`/legacy/book/`、`/book/`、404 页；
3. 新站产物与 `legacy/`、`book/` 路径互不冲突（URL 契约见
   `specs/001-blog-redesign/contracts/url-contract.md`）。

## Additional Constraints

- **部署平台**：GitHub Pages（用户站点 `lukechou166.github.io`），仅支持静态
  文件与 `404.html` 兜底，无服务端重写；旧 URL 兼容策略为「404 页 +
  历史版本入口」，逐条跳板页仅对高价值链接手动添加。
- **源码与产物分离**：`site-src/` 是 Astro 源码工程（唯一改动入口）；
  仓库根目录的 HTML/静态资源是构建产物，MUST 通过
  `cp -R site-src/dist/. .` 生成，MUST NOT 手工编辑根目录产物页面。
- **忽略规则**：`site-src/node_modules/`、`site-src/dist/`、`site-src/.astro/`
  不入库（见根 `.gitignore`）。

## Development Workflow

1. 非琐碎变更走 spec 流程：`/speckit.specify` → `/speckit.plan` →
   `/speckit.tasks` → 实现；琐碎修正直接实现并存档到 `doc/changes/`。
2. 实现后按 Principle IV 验证；按 Principle I 完成变更存档。
3. 发布：提交构建产物 + 源码，推送 `master`，GitHub Pages 自动部署。

## Governance

- 本 Constitution 优先于其他一切工程惯例；与之一致的实践方可执行。
- 修订 MUST 记录版本号（语义化：MAJOR 原则删除/重定义，MINOR 新增原则或
  实质扩展，PATCH 措辞澄清）、修订日期与修订内容，并更新 Last Amended。
- 合规审查：每次变更存档时自查四项原则；发现违规必须在合并/发布前纠正
  或在存档中说明豁免理由。
- 模板解析以 `.specify/templates/constitution-template.md` 为基线，本文件为
  项目唯一生效宪法。

**Version**: 1.0.0 | **Ratified**: 2026-11-04 | **Last Amended**: 2026-11-04
