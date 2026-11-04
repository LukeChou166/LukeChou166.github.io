# Implementation Plan: 博客改版（老站归档 + 新方案选型）

**Branch**: `001-blog-redesign` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-blog-redesign/spec.md`

## Summary

当前站点为 Hexo 4.2.1 + hexo-theme-matery 的构建产物（GitHub Pages），视觉风格偏重、组件化痕迹明显。本次改版分两步：① 将现有整站（含 `book/`）快照归档到 `/legacy/` 历史空间，保证旧内容与旧 URL 可达；② 对比 ≥3 个候选博客方案（覆盖 Hexo/Hugo/Astro/Eleventy 等技术栈），按「简单、美观、大气、低调而有内涵」的审美标准选定一个，并规划内容迁移与新站落地结构。

## Technical Context

**Language/Version**: Markdown + 静态站点生成器（候选：Hexo 7 / Hugo 0.1xx / Astro 5 / Eleventy 3）；当前产物由 Hexo 4.2.1 生成

**Primary Dependencies**: 无运行时依赖（纯静态）；构建期依赖取决于选定框架

**Storage**: 无数据库；内容为 Markdown 文件（旧文章在作者本地 Hexo 工程 `source/_posts`，本仓库仅存构建产物）

**Testing**: 本地静态服务（`npx serve -p 4000` / `python3 -m http.server`）+ 抽查链接可达性 + Lighthouse

**Target Platform**: GitHub Pages（用户站点，根路径部署）；现代浏览器 + 移动端响应式

**Project Type**: 静态内容站点（static-site）

**Performance Goals**: 首页 Lighthouse 性能 ≥ 90；关键 CSS 内联/少量，无重型框架（告别 jQuery + Materialize）

**Constraints**: GitHub Pages 静态托管（无服务端重写）；`/legacy/` 子路径下资源路径必须自洽；不改变部署仓库

**Scale/Scope**: 旧站约 30+ 页面 + book 知识分享 20+ 篇；新站功能为 首页/文章/归档/关于，单作者单语言（中文）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` 为未填写的初始模板，无项目级约束条款，**无门禁冲突**。按通用工程原则自查：

- ✅ 简单优先：优先复用现成成熟主题，不手写造轮子
- ✅ 内容零丢失：老站先归档再动新站
- ✅ 纯静态：不引入服务端/数据库

**结论：PASS**（Phase 1 设计后复查：仍 PASS，未新增复杂度）

## Project Structure

### Documentation (this feature)

```text
specs/001-blog-redesign/
├── plan.md              # 本文件
├── spec.md              # 需求规格
├── research.md          # Phase 0: 候选方案调研与选型
├── data-model.md        # Phase 1: 内容模型
├── quickstart.md        # Phase 1: 验证指南
└── contracts/           # Phase 1: URL/路由与目录契约
    └── url-contract.md
```

### Source Code (repository root)

```text
# 改版后仓库布局（Phase 2 tasks 落地时生效）
index.html            # 新站首页（由选定生成器产出到根路径）
assets/               # 新站静态资源（由生成器输出结构决定）
book/                 # 知识分享 GitBook（保留，新站导航指向）
legacy/               # 旧站整站快照（旧 Hexo 产物，root 改为 /legacy/ 重新生成或改写路径）
legacy/book/          # book 兜底镜像（可选，防止迁移期间断链）
404.html              # 新站 404（含「历史版本」入口提示）
```

**Structure Decision**: 单仓库静态站点。新站产物在根路径，旧站整体快照收进 `legacy/` 子目录。因旧产物使用根绝对路径（`/css/...`），归档时必须在本地 Hexo 工程以 `root: /legacy/` 重新 generate（首选），或对新产物做路径改写（备选，见 research.md R2）。
