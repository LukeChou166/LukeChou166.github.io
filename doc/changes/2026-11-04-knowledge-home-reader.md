# 变更存档：首页即知识分享（多书阅读器）

- **类型**: feature
- **日期**: 2026-11-04
- **Spec 流程**: `specs/002-knowledge-home/`（spec / plan / research / data-model / contracts / quickstart / tasks）

## 背景

上一轮改版（001-blog-redesign）上线了 Astro + AstroPaper 新站，首页仍是博客
文章列表。用户提出三点新需求：① 首页就是知识分享；② 知识分享左边是目录、
右边是内容，可点击到对应章节的 md 文件；③ 知识分享可能有多个。

## 技术方案

- **运行时渲染**（research.md R1）：书籍经 Actions subtree 同步后必须
  "同步即上线"（FR-007 不重新构建），因此章节 Markdown 由浏览器端
  fetch + 渲染，阅读器页面本身由 Astro 构建一次。渲染库选用 marked
  （npm 打包，无 CDN）。
- **多书组织**（R3）：`book/<slug>/` 每书一目录，`book/books.json` 清单驱动；
  现有 claude-code-book subtree 迁入 `book/claude-code-book/`，
  `sync-book.yml` prefix 同步迁移（外部 notify 工作流有每小时兜底降级）。
- **章节路由**（R4）：hash 路由 `#/<book>/<chapter>.md`，刷新可恢复；
  「查看源文件」直接链接 `/book/<id>/<章节>.md`（Pages 原生服务 md）。
- **目录来源降级**：SUMMARY.md 链接列表 > books.json `chapters` 显式清单
  （实现中发现 claude-code-book 的 SUMMARY 是总结文章、0 个链接，
  故增加 chapters 清单机制）。
- **关键坑**：Layout 的 `ClientRouter`（视图过渡）拦截同源链接点击改用
  pushState 导航，**不触发 hashchange**——阅读器目录点击首次失效。
  修复：捕获阶段拦截阅读器内 `a[href^="#/"]` 自行以 `location.hash` 赋值
  导航，并监听 `astro:page-load` 幂等重初始化（视图过渡返回首页后恢复）。

## 变更文件清单

**书籍数据层（内容零修改，纯移动）**
- `book/*.md`、`book/index.html` → `book/claude-code-book/`（git mv，22 个文件 R100）
- 新增 `book/books.json`（书籍清单契约）
- 新增 `book/index.html`（旧入口兼容跳转页，US3）

**工作流**
- `.github/workflows/sync-book.yml`：subtree prefix `book` → `book/claude-code-book`

**阅读器（site-src）**
- 新增 `site-src/src/scripts/reader/`：
  - `types.ts`（Book/Chapter/ReaderState，state 机 idle|loading|rendered|missing）
  - `loader.ts`（books.json/SUMMARY.md/章节 fetch；校验降级）
  - `markdown.ts`（marked 渲染 + 相对路径归一化 + 内链转 hash 路由）
  - `route.ts`（hash 解析/生成、localStorage 上次阅读）
  - `app.ts`（入口：书架/目录/内容编排、hashchange、astro:page-load、抽屉）
- 重写 `site-src/src/pages/index.astro`：首页改为阅读器布局（左 260px 目录 +
  右内容卡，移动端抽屉，全局样式用主题 CSS 变量）
- 新增 `site-src/src/components/BookShelf.astro`（书架容器）
- 修改 `site-src/src/components/Header.astro`：「知识分享」→ `/`
- 修改 `site-src/src/layouts/Layout.astro`：移除不存在的 favicon.ico 引用
- 修改 `site-src/package.json`：新增 marked 依赖

**文档**
- `specs/002-knowledge-home/`（全套设计文档与 tasks.md）
- `README.md`（首页即知识分享、新书接入步骤、同步说明）

## 主要更改内容

1. 首页 `/` 由博客列表改为多书阅读器；博客列表移至 `/posts/`，导航同步调整
2. 目录由 SUMMARY.md 驱动（无链接时用 books.json chapters），点击章节
   右侧渲染，hash 路由刷新可恢复，每章带「查看源文件」
3. 多书：`book/books.json` 登记即上书架；无效书（目录/SUMMARY 缺失）
   控制台警告并跳过；新增书零代码、零构建
4. `book/` 重构为多书目录结构，subtree 同步工作流随之迁移

## 验证

- `npm run build`（astro check + build + pagefind）0 errors；已部署产物到仓库根
- Playwright 实测（本地 http.server）：
  - 首页双栏渲染、20 章目录、点击章节切换（含真实 anchor 点击、正文内链）
  - hash 刷新恢复位置；「查看源文件」指向原始 md（200）
  - 多书：test-book 新增即上书架、SUMMARY 链接目录、切书互不串扰；
    ghost-book（目录缺失）警告并跳过（shelf 只剩 1）
  - `/book/` 跳转到阅读器并选中 claude-code-book；旧 Docsify 壳仍可访问
  - 博客回归：/posts/ 列表 5 篇、文章页正常
  - 移动端 375px：目录折叠抽屉、菜单按钮显示
- 宪法自查（T021）：book/ 为纯重命名（R100）+ 2 个新文件；`legacy/` 零改动；
  书籍文件内容 diff 为零
