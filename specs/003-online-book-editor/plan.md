# Implementation Plan: 在线编辑 book 内容（仅仓库所有者可见）

**Branch**: `003-online-book-editor` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-online-book-editor/spec.md`

## Summary

在现有阅读器（`site-src/src/scripts/reader/`）上新增纯客户端的编辑模块：
站点所有者在浏览器中输入本仓库细粒度访问凭据完成身份确认后，可对当前章节
Markdown 与书籍目录（SUMMARY）进行纯文本编辑 + 实时预览，保存时直接提交到
站点仓库（内容接口 PUT + 最新 sha 冲突校验），推送后由既有 GitHub Pages
自动部署上线。非所有者访问时编辑模块完全不渲染、不可达；不引入任何服务端
组件，保持纯静态（宪法原则 II）。

## Technical Context

**Language/Version**: TypeScript 5.x（Astro v7 工程内的客户端脚本，与 reader
现有模块同栈）

**Primary Dependencies**: marked（已有，复用 `renderMarkdown` 做预览，保证
FR-005 同一渲染管线）；GitHub REST Contents API（保存通道，平台接口而非
新增依赖）；无新增 npm 依赖

**Storage**: 无服务端存储。运行时状态仅浏览器 localStorage（凭据会话、
编辑日志）与内存（草稿/编辑态）；内容落点为站点仓库 `book/` 目录

**Testing**: `astro check`（类型检查）+ `npm run build`（宪法原则 IV 门禁）+
`quickstart.md` 手动验证场景（涉及真实凭据与真实提交，v1 不做自动化 e2e）

**Target Platform**: GitHub Pages（纯静态，无服务端重写）；现代浏览器
（支持 fetch / localStorage / beforeunload）

**Project Type**: 静态站点 + 客户端阅读器/编辑器增强（单前端工程，无后端）

**Performance Goals**: 进入编辑态无感知延迟（本地已有章节原文，编辑态直接
复用当前章节内容，无需二次拉取）；预览渲染与阅读态同量级（60KB 文档
< 100ms，与现有渲染一致）

**Constraints**: 凭据 MUST 仅存 localStorage（FR-002）；保存 MUST 基于
远端最新 sha 校验冲突（FR-006）；对访客 MUST 零编辑痕迹（FR-001）；
`claude-code-book/` 编辑 MUST 展示同步覆盖警示（FR-011）

**Scale/Scope**: 2 本书、20+ 章节文件的 Markdown 编辑；单用户（所有者）
低频保存（每日个位数提交），无并发压力

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 结论 | 说明 |
|------|------|------|
| I. 变更存档 | ✅ 通过 | 本特性走 spec 流程，产物存档于 `specs/003-online-book-editor/` |
| II. 静态优先 | ✅ 通过 | 纯客户端实现，保存走平台公开内容接口，不引入服务端/数据库/自维护服务；自研代码仅用于阅读器内粘合 |
| III. 内容零丢失 | ⚠️ 有条件通过 | 冲突保存不覆盖 + 草稿保护（FR-006/009）满足正文不丢；已知张力：编辑 `claude-code-book/` 的提交会被 `sync-book.yml` 的镜像同步覆盖。缓解：编辑界面强制警示（FR-011）+ 警示中推荐使用 `agent-papers/` 等手动维护目录（spec A3 豁免，理由见 Complexity Tracking） |
| IV. 先验证后交付 | ✅ 通过 | 交付门禁不变（`astro check` + `npm run build` + 本地静态服务抽查）；本特性额外要求 quickstart 场景全通过（含真实保存验证） |

**Post-Phase 1 复核**：设计未引入服务端组件、未修改 `legacy/`、未改动
`sync-book.yml` 与 `book/claude-code-book` 的同步契约；编辑器不新增
URL/hash 路由（编辑态为内存态），URL 契约（`specs/001-blog-redesign/contracts/url-contract.md`）
不受影响。四项原则复核通过。

**Post-Implementation 复核（2026-11-07）**：实现与契约一致性自查通过——
commit message 模板、localStorage 键（`reader:owner-session`/`reader:edit-log`）、
409/401 分支、访客零编辑元素、无新增 hash 路由均按 contracts/ 落实；
`npm run build`（astro check + build + pagefind）零错误，根目录产物已同步，
`/`、`/book/agent-papers/OpenHands_zh.md`、`/book/books.json`、`/legacy/`、
404 兜底抽查全部可达。原则 II/III 复核结论不变。遗留：quickstart 中需真实
PAT 的端到端场景（场景 3/4 保存链路）待所有者凭据可用时执行。

## Project Structure

### Documentation (this feature)

```text
specs/003-online-book-editor/
├── plan.md              # 本文件
├── research.md          # Phase 0：技术决策（R1-R6）
├── data-model.md        # Phase 1：实体与状态机
├── quickstart.md        # Phase 1：端到端验证指南
├── contracts/           # Phase 1：接口契约
│   ├── github-contents-api.md
│   ├── local-storage.md
│   └── ui-editor-contract.md
└── tasks.md             # Phase 2 输出（/speckit.tasks，本命令不创建）
```

### Source Code (repository root)

```text
site-src/src/scripts/reader/
├── app.ts               # 修改：挂载编辑入口/编辑态，切换守卫接入
├── loader.ts            # 修改：导出 fetchChapter 已有，新增读取章节 sha 所需的远端元数据函数
├── markdown.ts          # 复用：renderMarkdown 作为编辑预览（FR-005）
├── route.ts             # 不变：不新增 hash 路由，编辑态为内存态
├── types.ts             # 修改：新增编辑相关类型
└── editor/              # 新增：编辑模块（仅所有者可见的代码路径）
    ├── auth.ts          #   所有者会话：凭据录入、身份校验、会话持久化
    ├── editor.ts        #   编辑态 UI：文本域 + 实时预览 + 未保存守卫
    └── save.ts          #   保存通道：读取远端 sha、冲突校验、提交写回
```

**Structure Decision**: 延续 002-knowledge-home 的单前端结构，编辑模块作为
reader 的子目录新增，不引入新工程/新目录层级；Astro 打包为同一 bundle，
访客虽会下载到编辑模块代码，但无凭据时功能不可用且 UI 零渲染
（FR-001 由运行时状态保证，见 research.md R5）。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 宪法 III 张力：允许编辑会被自动同步覆盖的 `claude-code-book/` | spec 用户要求对 book 全量在线编辑（含书源镜像目录） | 禁止编辑镜像目录会削弱"网页维护 book"的核心诉求；编辑自动回流书源仓库（跨仓库 PR/commit）复杂度高且违背原则 II。折中为「允许编辑 + 强制覆盖警示（FR-011）」，真实内容维护以 `agent-papers/` 为推荐目标 |
