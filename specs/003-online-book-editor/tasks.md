---
description: "Task list for 003-online-book-editor"
---

# Tasks: 在线编辑 book 内容（仅仓库所有者可见）

**Input**: Design documents from `/specs/003-online-book-editor/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: spec 未要求自动化测试（v1 采用 quickstart.md 手动验证 + `npm run build`
门禁），故本清单不含测试任务；每个 US 末尾含对应 quickstart 验证任务。

**Organization**: 按用户故事分组，每个故事可独立实现、独立验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 所属用户故事（US1-US4，对应 spec.md 优先级 P1/P1/P1/P2）
- 所有路径相对仓库根目录

## Path Conventions

单前端工程（plan.md Structure Decision）：编辑模块全部位于
`site-src/src/scripts/reader/`（既有 reader + 新增 `editor/` 子目录），
文档/产物在 `specs/003-online-book-editor/`。

**实现契约提醒**：编码前先读
`specs/003-online-book-editor/contracts/github-contents-api.md`、
`contracts/local-storage.md`、`contracts/ui-editor-contract.md`，
任务描述中的字段/键名/文案以契约为准，MUST NOT 自行变更键名或结构。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 类型与共享基础，所有故事的前置

- [X] T001 在 `site-src/src/scripts/reader/types.ts` 新增编辑模块类型：`OwnerSession`
  （token/login/verifiedAt，字段见 specs/003-online-book-editor/data-model.md）、
  `Draft`（bookId/path/original/current/baseSha: string|null/dirty）、
  `ChangeRecord`（at/bookId/path/kind: "update"|"create"/result: "success"|"conflict"|"failed"/detail/commitUrl?）、
  `EditTarget`（kind: "chapter"|"summary"）；字段约束按 data-model.md 原文实现
- [X] T002 [P] 在 `site-src/src/scripts/reader/editor/auth.ts` 顶部实现编辑配置常量：
  `owner = "LukeChou166"`、`repo = "luluyouyue.github.io"`、`branch = "master"`
  （research.md R6；注释 MUST 说明与 `site-src/astro-paper.config.ts` 的
  site.profile 联动，改动需同步两处）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 身份会话与保存通道两个纯逻辑模块，任何用户故事的前置

**⚠️ CRITICAL**: US1-US4 全部依赖本阶段

- [X] T003 完成 `site-src/src/scripts/reader/editor/auth.ts`（OwnerSession 模块）：
  凭据录入 → `GET https://api.github.com/user`（请求头见 contracts/github-contents-api.md）
  → login 与 owner 比对 → 成功写入 `localStorage["reader:owner-session"]`
  （格式见 contracts/local-storage.md）；失败分支：401/凭据无效、login 不匹配
  （非所有者）→ 返回原因不清会话；`restoreSession()`：加载时轻量复核
  （GET /user），失败静默清除降级访客态（FR-003/010）；`signOut()`：删除键
- [X] T004 [P] 完成 `site-src/src/scripts/reader/editor/save.ts`（保存通道，纯逻辑无 UI）：
  `fetchRemoteMeta(bookId, path)`（GET contents，200 → {sha, content}；
  404 → null 表示新建）；`saveFile(draft)`（PUT contents，body 见
  contracts/github-contents-api.md：message 模板 `edit(book): update|create
  <bookId>/<path> via web editor`、content 为 Base64 全文、branch、sha（新建省略）；
  路径 MUST 以 `book/` 前缀校验）；响应映射按契约表（200/201 成功、409 冲突、
  401 会话失效、403/422 失败）；每次尝试写 `localStorage["reader:edit-log"]`
  环形日志（≤50 条，detail 不含 token，FR-012）

---

## Phase 3: User Story 1 - 访客看不到任何编辑入口 (Priority: P1)

**Story Goal**: 非所有者访问时编辑能力 DOM 级不存在、无路由可猜、保存必失败
（spec US1 / FR-001 / SC-001）

**Independent Test**: 未登录打开首页与任一章节，DOM 无编辑元素；拼编辑地址无效；
伪造会话降级为访客。

- [X] T005 [US1] 在 `site-src/src/scripts/reader/app.ts` 接入会话状态基线：初始化时
  调用 `restoreSession()`；无有效 OwnerSession 时**不渲染**任何编辑元素
  （编辑按钮/编辑目录/保存/编辑面板均不存在于 DOM，非 CSS 隐藏，
  ui-editor-contract.md「访客态」节）
- [ ] T006 [US1] 按 `specs/003-online-book-editor/quickstart.md` 场景 1 验证：
  无痕窗口 DOM 检查、`localStorage.setItem('reader:owner-session','{}')` 伪造后
  刷新降级访客态、控制台无凭据保存尝试失败且远端零变化；结果记录到本任务勾选说明

**US1 完成即达成 SC-001 的访客侧要求。**

---

## Phase 4: User Story 2 - 所有者登录后可见并进入编辑 (Priority: P1)

**Story Goal**: 所有者浏览器内确认身份 → 出现编辑入口 → 编辑态（纯文本 +
实时预览，FR-002/004/005/010/011）

**Independent Test**: 录入 PAT → 编辑入口出现 → 编辑态修改正文 → 预览实时更新 →
刷新免登录。

- [X] T007 [US2] 在 `site-src/src/scripts/reader/editor/editor.ts` 实现登录/退出 UI：
  访客态页脚不显眼文字链「所有者登录」（ui-editor-contract.md）；点击弹出口令输入
  → 调用 auth 校验（verifying 态「校验中…」）→ invalid 显示原因（凭据无效/
  非仓库所有者）→ 成功后触发 app 重渲染；owner 态提供「退出登录」（删
  `reader:owner-session` 回访客态）
- [X] T008 [US2] 在 `site-src/src/scripts/reader/app.ts` 接线 owner 态视图：
  会话建立后章节内容头（`reader-content-header`）追加「编辑」按钮（点击进入编辑态）、
  「退出登录」入口；页面加载 `restoreSession()` 成功后免登录直接可见（FR-010）
- [X] T009 [US2] 在 `site-src/src/scripts/reader/editor/editor.ts` 实现编辑面板：
  进入时以当前章节原文填充 Draft（original=current，dirty=false，baseSha 留待
  US3）；等宽 `<textarea>` 绑定 Draft.current；输入去抖 ~300ms 调用
  `renderMarkdown(current, bookId)`（`site-src/src/scripts/reader/markdown.ts`，
  FR-005 同管线）渲染预览面板；dirty 时标题旁「未保存」徽标；「取消」按钮
  （dirty 时二次确认）
- [X] T010 [US2] 在 `editor.ts` 实现警示条（FR-011）：`bookId === "claude-code-book"`
  时编辑态顶部渲染不可关闭警示（文案与说明链接见 contracts/ui-editor-contract.md
  与 research.md R7）
- [ ] T011 [US2] 按 `quickstart.md` 场景 2 验证（PAT 准备见该文件前提节）：
  登录 ≤1 分钟、编辑态 ≤10 秒、预览与阅读态渲染一致、刷新免登录

---

## Phase 5: User Story 3 - 编辑保存为仓库提交并自动上线 (Priority: P1)

**Story Goal**: 保存 → commit 写回仓库 → Pages 自动上线；冲突/失败零丢失
（spec US3 / FR-006/007 / SC-003/004）

**Independent Test**: 修改保存 → 仓库出现提交 → 数分钟上线；409 冲突不覆盖；
失败草稿保留。

- [X] T012 [US3] 在 `site-src/src/scripts/reader/app.ts` 补全编辑进入流程：
  进入编辑态时调用 `save.fetchRemoteMeta()` 缓存 `baseSha`（200 → sha；
  404 → null 即新建文件）；meta 获取失败时提示重试、不进入编辑态
  （contracts/github-contents-api.md 接口 2）
- [X] T013 [US3] 在 `editor.ts` 实现「保存」接线（dirty 为 false 时禁用）：调用
  `saveFile(draft)`；期间按钮「保存中…」禁用；成功 → ChangeRecord(success)
  已由 T004 记录，更新 baseSha、回阅读态并用新内容重新 `renderMarkdown`
  （ui-editor-contract.md 状态机）；反馈区展示提交链接
- [X] T014 [US3] 在 `editor.ts` 实现失败/冲突分支（FR-006/007）：409 → 提示
  「远端已更新」，草稿保留，提供「拉取最新」（重新 fetchRemoteMeta 覆盖
  original 与 baseSha，MUST NOT 自动带旧内容重试）与「放弃」；401 → 清除
  会话回访客态 + 引导重新登录，草稿保留；403/422/网络 → 展示原因摘要 +
  重试按钮；所有失败分支编辑区内容不丢失
- [ ] T015 [US3] 按 `quickstart.md` 场景 3、4 验证：保存成功出现
  `edit(book): … via web editor` 提交、上线 ≤5 分钟、edit-log 含 success 且
  各键不含 token、409 冲突流程完整且无静默覆盖

---

## Phase 6: User Story 4 - 编辑目录与未保存保护 (Priority: P2)

**Story Goal**: 网页编辑 SUMMARY 维护目录；dirty 切换/关闭有放弃确认
（spec US4 / FR-008/009）

**Independent Test**: 编辑 SUMMARY 增加章节链接保存生效；未保存切换触发确认。

- [X] T016 [US4] 在 `app.ts`/`editor.ts` 实现「编辑目录」入口：owner 态目录区
  （T008 之后）新增按钮，点击将 EditTarget 切为该书 `SUMMARY.md` 并复用编辑
  面板（fetchRemoteMeta 对 `book/<id>/SUMMARY.md` 取 sha；404 → 提示该书无
  SUMMARY，按新建处理）；保存成功后调用既有 `loadToc()` 重载该书目录
  （`site-src/src/scripts/reader/loader.ts`）并刷新 TOC 渲染
- [X] T017 [US4] 在 `app.ts`/`editor.ts` 实现 dirty 全局守卫（FR-009）：
  存在 dirty Draft 时拦截 TOC 点击、书架切换与 hashchange → 确认「放弃修改/
  留在编辑态」；注册 `beforeunload` 原生确认；确认放弃后丢弃 Draft 继续导航
  （Draft 为内存态，不落 localStorage，contracts/local-storage.md）
- [ ] T018 [US4] 按 `quickstart.md` 场景 5、6 验证：SUMMARY 保存生效并重载目录、
  指向不存在文件按新建处理、切换/关闭确认、claude-code-book 警示条

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 文档同步、全量门禁、宪法存档

- [X] T019 [P] 在根 `README.md`「知识分享专栏」章节补充「在线编辑（仅仓库
  所有者可见）」小节：入口说明、凭据要求（细粒度 PAT，仅本仓库 Contents RW）、
  claude-code-book 同步覆盖警示、指向 `specs/003-online-book-editor/quickstart.md`
- [X] T020 完成交付门禁（宪法原则 IV）：`cd site-src && npm run build` 零错误；
  根目录 `python3 -m http.server 4000` 抽查 `/`、`/book/agent-papers/OpenHands_zh.md`、
  `/legacy/`、404 页可达
- [X] T021 完成宪法原则 I 变更存档自查：确认 `specs/003-online-book-editor/`
  产物（plan/research/data-model/contracts/quickstart/tasks）与最终实现一致
  （如键名、commit 模板、文件路径有偏差 MUST 回写契约文件）；在 plan.md
  Constitution Check 表追加 Post-Implementation 复核行

---

## Dependencies

```text
Phase 1 (T001, T002)
   └── Phase 2 (T003, T004)
         ├── US1 (T005-T006)   ← 最先验证：访客零暴露是安全基线
         ├── US2 (T007-T011)   ← 依赖 T003（登录/会话）
         │     └── US3 (T012-T015)  ← 依赖 T009（编辑面板）与 T004（保存通道）
         │           └── US4 (T016-T018)  ← 依赖 T009（面板复用）、T012（sha 流程）
         └── Phase 7 (T019-T021)  ← 全部故事完成后
```

- US1 依赖 Phase 2（需要 restoreSession 判断会话态），与 US2 并行时注意
  T008 与 T005 同文件 `app.ts`，建议按 T005 → T008 顺序串行合并
- US3 依赖 US2 的编辑面板（T009）；US4 依赖 US2/US3 的面板与 sha 流程
- 快速依赖路径：T001 → T003 → T005 → T008 → T009 → T012 → T013

## Parallel Execution Examples

```bash
# Phase 1/2 可并行（不同文件）：
Task: T001 types.ts 类型定义        ‖  Task: T002 auth.ts 配置常量
Task: T003 auth.ts OwnerSession     ‖  Task: T004 save.ts 保存通道

# US2 内（不同文件）：
Task: T007 editor.ts 登录 UI        ‖  Task: T008 app.ts owner 态接线

# US1 与 US2 可由两人并行，但 T005/T008 均改 app.ts（同文件合并冲突，
# 建议同一人顺序完成或先 T005 后 T008）
```

## Implementation Strategy

- **MVP First**：Phase 1-2 + US1 即构成"访客零暴露"的安全基线，可独立合入
  （无任何用户可见变化）；建议作为第一个提交
- **Incremental**：US2（可编辑）→ US3（可保存上线）→ US4（目录 + 守卫），
  每个故事完成后按 quickstart 对应场景验证再进入下一个
- **风险前置**：真实凭据/真实提交贯穿 US3 验证，建议按 quickstart 提示先以
  只读 PAT 走通 403 分支再换读写 PAT

## Notes

- [P] 任务 = 不同文件、无未完成依赖
- [Story] 标签对应 spec.md 用户故事（US1/US2/US3 = P1，US4 = P2）
- 每个任务或逻辑组完成后提交一次；任一故事可独立停止验证
- 禁止：模糊任务、同文件并行修改未协调、跨故事循环依赖
