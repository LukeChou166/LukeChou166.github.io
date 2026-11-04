---
description: "Task list for 002-knowledge-home (首页即知识分享/多书阅读器)"
---

# Tasks: 首页即知识分享（多书阅读器）

**Input**: Design documents from `/specs/002-knowledge-home/`

**Prerequisites**: plan.md、spec.md、research.md、data-model.md、contracts/（均已就绪）

**Tests**: 未要求自动化测试；以 quickstart.md 的手动场景作为验证任务（Polish 阶段）。

**Organization**: 按用户故事分组（US1 首页阅读器 / US2 多书 / US3 旧入口兼容）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 所属用户故事（US1/US2/US3）
- 描述中含精确文件路径

## Path Conventions

- Astro 源码：`site-src/src/`；书籍数据：`book/`；工作流：`.github/workflows/`
- 构建产物部署：`cd site-src && npm run build && cp -R dist/. ..`

---

## Phase 1: Setup（共享基础设施）

**Purpose**: 依赖与书籍数据布局就绪

- [ ] T001 在 site-src 安装 marked 依赖（`npm i marked`，写入 site-src/package.json dependencies；不使用 CDN，符合 research.md R2）
- [ ] T002 迁移书籍目录：将 `book/` 下现有内容（index.html、SUMMARY.md、README.md、CODE_INDEX.md、全部章节 md）`git mv` 到 `book/claude-code-book/`（文件内容零修改，符合宪法 III）
- [ ] T003 [P] 创建书籍清单 `book/books.json`，内容遵循 specs/002-knowledge-home/contracts/books-json.md（version:1，登记 claude-code-book：title「Claude Code 深度源码解析」、description「基于 Claude Code 反编译还原源码的深度解析专栏」、defaultChapter「README.md」、order:1）
- [ ] T004 修改 `.github/workflows/sync-book.yml` 第 34 行 subtree prefix：`--prefix=book` → `--prefix=book/claude-code-book`（注释说明外部 notify 工作流需同步更新，兜底 cron 不受影响，见 research.md R3）

**Checkpoint**: `book/claude-code-book/SUMMARY.md` 存在；`book/books.json` 可被 JSON.parse；`git status` 显示纯重命名。

---

## Phase 2: Foundational（阻塞前置）

**Purpose**: US1/US2/US3 共同依赖的类型与工具函数

- [ ] T005 创建 `site-src/src/scripts/reader/types.ts`：定义 Book（id/title/description/defaultChapter/order）、Chapter（path/title/depth/state: 'idle'|'loading'|'rendered'|'missing'）、BooksManifest（version/books）、ReaderState（currentBook/currentChapter/books/toc），字段约束与 specs/002-knowledge-home/data-model.md 一致（id 必填唯一 `[a-z0-9-]+`；defaultChapter 默认 `README.md`）
- [ ] T006 [P] 创建 `site-src/src/scripts/reader/loader.ts`：实现 `loadBooksManifest()`（fetch `/book/books.json`，解析失败抛出可展示错误）、`loadToc(bookId)`（fetch `/book/<id>/SUMMARY.md`，解析 markdown 链接列表生成 Chapter[]，忽略非相对 `.md` 链接与外链，depth 取条目嵌套层级）、`fetchChapter(bookId, path)`（fetch 返回文本，404 → state:'missing'）
- [ ] T007 [P] 创建 `site-src/src/scripts/reader/markdown.ts`：封装 marked 渲染 `renderMarkdown(md, baseUrl)`；实现相对链接/图片解析基准 `/book/<id>/`（data-model.md VR-6）；同书 `.md` 相对链接转成阅读器内 hash 路由 `#/<book>/<path>`（contracts/url-contract.md C-3）

**Checkpoint**: `cd site-src && npx tsc --noEmit`（或 astro check）零错误。

---

## Phase 3: User Story 1 — 首页阅读器（P1）✫ MVP

**Story Goal**: 打开 `/` 即看到左目录右内容，点击目录渲染对应章节

**Independent Test**: quickstart.md 场景 1（1.1–1.5）

- [ ] T008 [US1] 重写 `site-src/src/pages/index.astro`：复用主题 Layout/Header/Footer 与暗色模式，主体替换为阅读器骨架（`<aside id="reader-toc">` + `<article id="reader-content">` 双栏布局，桌面 260px 侧栏 + 自适应正文列，移动端抽屉预留），移除原首页文章列表
- [ ] T009 [US1] 创建 `site-src/src/scripts/reader/route.ts`：hash 路由解析与生成——`#/<book>/<chapter>.md` ↔ ReaderState；无 hash 时推导初始状态（URL hash > localStorage 上次阅读 > books.json 第一本的 defaultChapter）并用 history.replaceState 写回（data-model.md Reader 状态）
- [ ] T010 [US1] 创建 `site-src/src/scripts/reader/app.ts`（入口）：串联 loader/route/markdown——初始化加载清单与目录、渲染目录 DOM（Chapter.depth 控制缩进）、绑定目录点击 → fetchChapter → renderMarkdown → 内容区 innerHTML → 更新 hash、监听 hashchange 恢复位置、章节 state:missing 时内容区显示「章节缺失」提示（spec.md Edge Cases）
- [ ] T011 [US1] 在 `site-src/src/pages/index.astro` 中每个渲染完成的章节标题行添加「查看源文件」链接，指向 `/book/<id>/<chapter-path>`（原始 md，contracts/url-contract.md C-2）
- [ ] T012 [US1] 移动端适配（FR-008）：≤768px 目录折叠为抽屉（按钮开合），点击章节后自动收起；样式写入 index.astro 内联 `<style>` 或 `site-src/src/styles/`
- [ ] T013 [US1] 调整 `site-src/src/components/Header.astro` 导航语义：「首页」链接指向 `/`（即阅读器，标签文案可改「知识分享」），保留「文章/归档/标签/关于/历史版本」（FR-009）

**Checkpoint**: 本地 `python3 -m http.server` 下 quickstart 场景 1 全通过；博客 `/posts/` 不回归。

---

## Phase 4: User Story 2 — 多书支持（P2）

**Story Goal**: 书架切换多本书，新书零代码接入

**Independent Test**: quickstart.md 场景 2（2.1–2.4）

- [ ] T014 [P] [US2] 创建 `site-src/src/components/BookShelf.astro`：书籍卡片列表（title/description 渲染，当前书高亮），数据由 app.ts 传入 books 数组
- [ ] T015 [US2] 在 `site-src/src/scripts/reader/app.ts` 接入 BookShelf：渲染于目录上方（或顶部切换条）；切换书 → 重置 currentChapter 为该书 defaultChapter → 重载目录与内容 → 更新 hash 与 localStorage（data-model.md 切换书转移）
- [ ] T016 [US2] 无效书降级（data-model.md 校验）：books.json 中 id 对应目录/SUMMARY.md 缺失 → console.warn 并从书架剔除；清单 JSON 解析失败 → 首页显示「书籍清单不可用」错误态（contracts/books-json.md）

**Checkpoint**: quickstart 场景 2 全通过（含临时测试书的新增/删除降级）。

---

## Phase 5: User Story 3 — 旧 book 入口兼容（P3）

**Story Goal**: 旧 `/book/` 链接与原书内深链均可达

**Independent Test**: quickstart.md 场景 3（3.1–3.3）

- [ ] T017 [US3] 创建 `book/index.html` 兼容跳转页：meta refresh 0s 跳转 `/#/claude-code-book/README.md` + 手动链接兜底（research.md R5）
- [ ] T018 [US3] 验证保留的 `book/claude-code-book/index.html`（原 Docsify 壳）在子目录下仍可用：检查其 CDN 脚本与相对资源引用不受迁移影响；若 Docsify 相对路径失效，修正其 `window.$docsify.basePath` 指向 `./`（文件属于本仓库维护的壳，可修改）

**Checkpoint**: quickstart 场景 3 全通过。

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: 构建、回归验证与存档

- [ ] T019 运行 `cd site-src && npm run build`（astro check + build + pagefind）确保零错误；`cp -R dist/. ..` 部署产物到仓库根
- [ ] T020 按 `specs/002-knowledge-home/quickstart.md` 执行场景 1–5 全量回归（含移动端与博客回归），记录结果
- [ ] T021 检查 `sync-book.yml` 与书籍迁移不破坏宪法 III：`legacy/` 未被触碰、书籍文件 diff 为零内容变更（仅移动）、`book/books.json` 不在 subtree 覆盖范围内
- [ ] T022 更新 `README.md`：首页即知识分享、新增书籍步骤（放目录 + 登记 books.json）、外部 notify 工作流 TODO 说明
- [ ] T023 按宪法 Principle I 在 `doc/changes/2026-11-04-knowledge-home-reader.md` 写 feature 存档（背景/技术方案/变更文件清单/主要更改内容/验证结果）

---

## Dependencies

```text
Phase 1 (Setup: T001–T004)
   → Phase 2 (Foundational: T005–T007)
      → Phase 3 (US1: T008–T013)   ← MVP
      → Phase 4 (US2: T014–T016)   依赖 US1 的 app.ts/页面骨架
      → Phase 5 (US3: T017–T018)   仅依赖 Phase 1 的目录迁移，可与 US1/US2 并行
         → Phase 6 (Polish: T019–T023) 依赖全部故事完成
```

- US2 依赖 US1 的阅读器骨架（app.ts / index.astro）
- US3 与 US1/US2 相互独立（仅依赖 Phase 1）
- 注意文件冲突：T010/T015/T016 同改 `site-src/src/scripts/reader/app.ts`，必须串行

## Parallel Execution Examples

```text
# Phase 1 内可并行：T003（books.json）与 T001/T002 无依赖冲突
# Phase 2 内可并行：T006、T007（不同文件，均依赖 T005 的类型）
# US3 整体可与 US1 并行（T017/T018 只动 book/ 目录）
# Phase 6 内 T022 与 T023 可并行（不同文件）
```

## Implementation Strategy

1. **MVP First**：完成 Phase 1 → 2 → 3（US1）后即可在 `/` 阅读现有书籍；验证后再进入 US2
2. **增量交付**：US1（单书阅读器）→ US2（多书）→ US3（兼容）每步独立可验证
3. **风险前置**：T004（工作流 prefix）与外部 notify 工作流解耦（兜底 cron 存在），可在 US3 完成后最后统一验证
4. 每个故事完成后 commit 一次；全部完成后执行 T019–T023 收尾
