# Phase 0 Research: 首页即知识分享（多书阅读器）

Feature: 002-knowledge-home | Date: 2026-11-04

## R1. 渲染方式：构建期 vs 运行时

- **Decision**: **运行时渲染**——阅读器页面由 Astro 构建（一次性），章节
  Markdown 在浏览器端 fetch + 渲染
- **Rationale**: 硬约束 FR-007「书籍更新无需重新构建」。书籍经
  `git subtree` 同步进 `book/` 后直接随静态托管上线；若构建期把章节固化成
  HTML，每次 Actions 同步完还得跑 `npm run build` + 提交产物，工作流翻倍、
  同步延迟从分钟级变成依赖构建时长，违背"同步即上线"
- **Alternatives considered**:
  - 构建期渲染（SSG 全书页面）：SEO 最好，但需要改造 sync-book.yml 为
    「同步 → 构建 → 双提交」，构建耗时长（Astro check + pagefind），且书更新
    频率远低于文章，ROI 低。作为未来可选优化记录
  - 首页 iframe 嵌现有 Docsify 壳：实现最快，但视觉割裂、移动端体验差、
    无法做成统一首页，否决

## R2. Markdown 渲染器选型

- **Decision**: **marked**（npm 依赖，随 Astro bundle）
- **Rationale**: 体积小、API 简单、足够覆盖书籍 md（标题/代码块/表格/图片/
  链接）；书籍内容为受信来源（自己同步的书），XSS 面小，可暂不引入
  sanitizer（在 data-model 中记录为已知取舍；若未来开放投稿需加 DOMPurify）
- **Alternatives considered**:
  - markdown-it：插件生态强但体积更大，本书籍内容用不到
  - marked + highlight.js：代码高亮增强项，默认不高亮也可接受（书籍中代码
    块用 AstroPaper 站内字体即可读）；列为后续可选
  - remark/unified 在浏览器端运行：构建链思维，包体过大，否决

## R3. 多书组织与同步工作流

- **Decision**: `book/<slug>/` 每书一目录；现有 claude-code-book 迁入
  `book/claude-code-book/`；书籍清单 `book/books.json`；`sync-book.yml`
  的 subtree prefix 由 `book` 改为 `book/claude-code-book`
- **Rationale**: 目录即命名空间，新书零冲突；清单驱动使新增书不改代码
  （SC-002）；prefix 修改是一次性提交，subtree 历史可延续
- **Alternatives considered**:
  - 平铺 book2/ book3/：命名不可持续，否决
  - 每书独立 subtree 自动发现（扫描 book/ 下所有含 SUMMARY.md 的目录）：
    可行且免 books.json，但书籍的展示名/简介/排序无处安放，仍需元数据文件，
    不如显式清单直观。清单缺失某目录时给出警告并跳过（降级策略）
- **NEEDS CLARIFICATION → 降级路径（R5）**：外部仓库 claude-code-book 的
  notify 工作流向本仓库发 `repository_dispatch`，其触发不受本仓库控制；
  prefix 迁移后即使 notify 侧未同步修改，每小时定时兜底同步仍工作
  （cron 不依赖 dispatch），实际风险为"实时触发失效、最多延迟 1 小时"，
  可接受，另需在 claude-code-book 仓库更新 notify 工作流的检查路径（外部 TODO）

## R4. 章节路由与源文件直达

- **Decision**: hash 路由 `#/<book-slug>/<chapter-path>.md`；「查看源文件」
  链接直接指向 `/book/<slug>/<chapter-path>.md`
- **Rationale**: hash 路由无需服务端重写（GitHub Pages 约束），刷新/分享
  可恢复位置（FR-005）；`.md` 文件本身被 Pages 当静态文件服务，零成本实现
  "点击到对应章节的 md 文件"（原始文件），同时渲染视图与源视图天然同源
- **Alternatives considered**: History API 路由（`/read/<book>/...`）需 404.html
  hack 或为每章生成占位页，复杂度不值

## R5. 旧入口兼容

- **Decision**: `/book/` 路径改为一个兼容跳转页（meta refresh + 手动链接），
  跳到 `/#/claude-code-book/README.md`
- **Rationale**: 旧 hash 深链（如 `/book/#/01-architecture-overview`）无法逐条
  映射到新 hash 格式，ROI 最高的方案是书级跳转；原 Docsify 壳（index.html）
  保留在 `book/claude-code-book/index.html`，原书内深链仍可旧样访问，两不误
- **注意**: 迁移后 `/book/` 顶层不再有 index.html（改为跳转页），
  `sync-book.yml` 的 subtree 操作目标变为子目录，不会覆盖该跳转页

## R6. 首页改造与导航

- **Decision**: 重写 `site-src/src/pages/index.astro` 为阅读器（复用主题
  Header/Footer/暗色模式）；AstroPaper 原首页文章列表已由 `/posts/` 承担，
  导航「首页」语义变为知识分享，文章入口保留
- **Rationale**: 满足"首页就是知识分享"；博客能力零损失（FR-009）
