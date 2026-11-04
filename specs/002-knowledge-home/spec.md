# Feature Specification: 首页即知识分享（多书阅读器）

**Feature Branch**: `002-knowledge-home`

**Created**: 2026-11-04

**Status**: Draft

**Input**: "新增feature 1、首页就是知识分享 2、知识分享左边是目录，右边是内容，可以点击到对应章节的md文件中 3、知识分享可能有多个"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 首页即阅读器 (Priority: P1)

访客打开站点首页，直接进入「知识分享」阅读界面：左侧为当前书的目录（来自该书的
`SUMMARY.md`），右侧为章节内容；点击目录项即在右侧渲染对应章节的 Markdown。

**Why this priority**: 这是本 feature 的核心体验，独立可交付。

**Independent Test**: 打开 `/`，左侧出现目录，点击任一章节，右侧渲染出该章节
Markdown 内容（标题层级、代码块、图片正常）。

**Acceptance Scenarios**:

1. **Given** 站点首页, **When** 打开 `/`, **Then** 展示阅读器布局（左目录右内容），
   默认载入默认书籍的首页章节（`README.md`）
2. **Given** 左侧目录, **When** 点击某章节, **Then** 右侧渲染该章节 md，
   URL 反映当前章节（hash 路由），刷新后仍停留在该章节
3. **Given** 章节正文, **When** 点击「查看源文件」, **Then** 打开该章节的原始
   `.md` 文件（由 GitHub Pages 直接提供）

---

### User Story 2 - 多书支持 (Priority: P2)

站点可承载多本知识分享书籍；阅读器提供书架/切换入口，可在书籍之间切换，
每本书有独立目录与内容空间。

**Why this priority**: 依赖 US1 的阅读器骨架，在其上扩展书籍维度。

**Independent Test**: 配置 ≥2 本书后，首页可见书架/切换控件，切换后目录与内容
正确切换，两书章节互不串扰。

**Acceptance Scenarios**:

1. **Given** 配置了多本书, **When** 打开首页, **Then** 可见书籍列表（书名、简介）
2. **Given** 正在读 A 书, **When** 切换到 B 书, **Then** 目录切换为 B 书 SUMMARY，
   内容载入 B 书默认章节
3. **Given** 新增一本书（目录 + SUMMARY.md + books.json 登记）, **When** 刷新首页,
   **Then** 无需改代码，新书出现在书架

---

### User Story 3 - 旧 book 入口兼容 (Priority: P3)

旧的 `/book/` 链接（Docsify 页及其 hash 深链）仍可达：`/book/` 提供兼容跳转，
把访客带到首页阅读器中对应书籍。

**Why this priority**: 兼容性兜底，不阻塞主线。

**Independent Test**: 访问 `/book/` 跳转到首页阅读器并选中 claude-code-book。

**Acceptance Scenarios**:

1. **Given** 外部旧链接 `/book/`, **When** 访问, **Then** 到达阅读器并选中
   `claude-code-book` 书籍
2. **Given** 现有书籍文件, **When** Actions subtree 同步后, **Then** 阅读器
   无需重新构建即读到新内容

## Edge Cases

- SUMMARY.md 中链接的章节 md 不存在 → 内容区显示"章节缺失"提示，不白屏
- 章节内的相对链接/图片（同书内其他 md、图片资源）→ 相对路径必须基于
  `/book/<slug>/` 解析并正常渲染/跳转（站内章节走阅读器内路由）
- 移动端窄屏 → 左侧目录折叠为抽屉，点击章节后自动收起
- 书籍尚未配置 books.json / SUMMARY.md 缺失 → 首页显示明确错误提示

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 首页 `/` MUST 呈现「左目录 + 右内容」的双栏阅读器布局
- **FR-002**: 目录 MUST 由所选书籍的 `SUMMARY.md` 生成，点击目录项在内容区
  渲染对应章节 Markdown
- **FR-003**: 阅读器 MUST 支持多书：书籍清单由 `book/books.json` 描述
  （id、标题、简介、路径、默认章节），新增书 MUST 只需新增目录与登记清单
- **FR-004**: 每个章节 MUST 提供「查看源文件」入口，指向原始 md 路径
- **FR-005**: 章节路由 MUST 使用 hash（`#/<book>/<chapter>.md`），刷新/分享
  可恢复阅读位置
- **FR-006**: `/book/` 旧入口 MUST 兼容跳转到阅读器并选中原书籍
- **FR-007**: 书籍内容更新（Actions subtree 同步推送新 md）MUST 无需重新
  构建站点即可生效
- **FR-008**: 阅读器 MUST 为响应式：移动端目录折叠为抽屉
- **FR-009**: 现有博客能力（文章列表 `/posts/`、归档、搜索）MUST 保留，
  导航调整为「知识分享」为首页入口

### Key Entities

- **Book（书籍）**: id、标题、简介、路径（`book/<slug>/`）、默认章节；
  物理形态为 `SUMMARY.md` + 章节 md + 静态资源，登记于 `books.json`
- **Chapter（章节）**: 书内一个 md 文件；由 SUMMARY.md 的条目引用；
  渲染状态：未加载 / 加载中 / 已渲染 / 缺失
- **Reader（阅读器）**: 首页客户端组件；状态 = 当前书 + 当前章节 + 渲染结果

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 打开 `/` 首屏即可阅读默认章节（目录 + 正文渲染完成）
- **SC-002**: 新增一本书仅需：放入 `book/<slug>/`（含 SUMMARY.md）+ 登记.books.json，
  全程不改任何页面代码
- **SC-003**: Actions 同步书籍后无需 `npm run build`，线上内容即可更新
- **SC-004**: 旧 `/book/` 链接跳转可用；博客 `/posts/` 功能回归正常

## Assumptions

- 书籍来源仍是 `git subtree` 同步的外部仓库（当前：claude-code-book），
  多书即多个 subtree/目录，同步工作流按需扩展（本仓库内的 `sync-book.yml`
  可改，外部仓库的 notify 工作流不在本仓库控制范围内）
- 阅读器为客户端渲染（静态托管 + 打包 JS），Markdown 渲染器作为 npm 依赖
  随站点构建打包，不依赖公共 CDN
- 首页不再展示博客文章列表；文章列表移至 `/posts/`（已存在）
