# Feature Specification: 博客改版（老站归档 + 新方案选型）

**Feature Branch**: `001-blog-redesign`

**Created**: 2026-11-04

**Status**: Draft

**Input**: "这个blog页面有点丑，1、老博客放历史空间 2请给几个候选博客方案：简单、美观、大气、低调而有内涵"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 老博客归档到历史空间 (Priority: P1)

访客仍可通过明确的入口访问旧版博客全部内容（文章、归档、标签、book 知识分享），旧内容零丢失、旧 URL 尽量可达。

**Why this priority**: 保存现有内容是改版的前提，先保底再做新站，避免改版过程中丢数据。

**Independent Test**: 部署后访问 `/legacy/` 能看到旧版首页、任一旧文章页和 `/legacy/book/`，内容与改版前一致。

**Acceptance Scenarios**:

1. **Given** 改版后的站点, **When** 访问 `/legacy/`, **Then** 展示旧版(matery)首页，样式与改版前一致
2. **Given** 改版后的站点, **When** 访问 `/legacy/book/`, **Then** 知识分享(GitBook)站点可正常浏览
3. **Given** 旧版页面内的相对/绝对链接, **When** 点击, **Then** 在 `/legacy/` 前缀下正常跳转不 404

---

### User Story 2 - 新博客方案选型 (Priority: P2)

作者从多个候选方案（不同静态站点框架 + 极简主题）中比较并选定一个，候选方案须满足：简单、美观、大气、低调而有内涵；每个方案给出效果风格、迁移成本、维护成本对比。

**Why this priority**: 决定新站技术路线，直接决定后续迁移与写作体验。

**Independent Test**: 存在选型文档（research.md），含 ≥3 个候选方案及对比结论，最终选定一个。

**Acceptance Scenarios**:

1. **Given** 选型文档, **When** 阅读, **Then** 每个候选有风格描述、优缺点、迁移成本评估
2. **Given** 选定方案, **When** 评审, **Then** 符合"简单/美观/大气/低调有内涵"的审美要求

---

### User Story 3 - 新站搭建与内容迁移 (Priority: P3)

新站部署为 GitHub Pages 根路径站点，旧文章内容迁入新站（保留正文 Markdown），提供旧→新关键 URL 的跳转提示。

**Why this priority**: 属于实施阶段，依赖 US1、US2 完成。

**Independent Test**: 新站在根路径可访问，文章列表/详情/归档可用，`/legacy/` 依旧可达。

**Acceptance Scenarios**:

1. **Given** 新站部署, **When** 访问根路径, **Then** 展示新主题首页
2. **Given** 旧文章, **When** 迁移后, **Then** 正文、标题、日期、标签保留

## Edge Cases

- 旧站 Hexo 产物使用根绝对路径（`/css/...`），平移到 `/legacy/` 子目录会断链 → 需用 `root: /legacy/` 重新生成或改写引用
- 新旧 URL 不一致 → 提供归档页入口 + 可选 404 页兜底跳转
- `book/` 知识分享是新站保留内容还是归档 → 默认保留在新站（内容仍有价值），镜像一份入 `/legacy/book/` 保底

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 旧版站点完整内容 MUST 保留在 `/legacy/` 路径下且可正常浏览
- **FR-002**: 新站 MUST 部署为 GitHub Pages 根路径站点
- **FR-003**: 候选方案 MUST ≥3 个且覆盖不同技术栈（Hexo/Hugo/Astro/Eleventy 中至少两类）
- **FR-004**: 选型 MUST 给出决策、理由与备选项记录（research.md）
- **FR-005**: 旧文章正文 MUST 以 Markdown 形式迁移到新站（不重写内容）
- **FR-006**: 新站导航 MUST 提供进入「历史版本」的入口

### Key Entities

- **Post（文章）**: 标题、日期、标签、分类、正文 Markdown；来源为本地 Hexo 工程的 `source/_posts`
- **LegacySite（历史站）**: 现有 Hexo+matery 构建产物整体快照，挂在 `/legacy/`
- **NewSite（新站）**: 选定框架 + 主题生成的新静态站，含首页/文章/归档/关于
- **Book（知识分享）**: `book/` GitBook 内容，新站保留

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/legacy/` 下旧站页面打开成功且无 404 资源（抽查首页+2篇文章+book）
- **SC-002**: 新站首页 Lighthouse 性能分 ≥ 90（旧站因 Materialize/jQuery 较重）
- **SC-003**: 旧站全部文章在新站可检索到（数量一致）
- **SC-004**: 候选方案对比文档完成，含 ≥3 方案与明确结论

## Assumptions

- 本仓库只存构建产物；Hexo 源码工程在作者本地，文章 Markdown 需从源码工程获取（若不可得，从现有 HTML 反解）
- 部署平台不变：GitHub Pages（用户页 `luluyouyue.github.io` / `LukeChou166.github.io`）
- 审美目标：「简单、美观、大气、低调而有内涵」→ 排版优先、留白多、低饱和配色、少动效
