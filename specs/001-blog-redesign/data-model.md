# Phase 1 Data Model: 博客改版

Feature: 001-blog-redesign | Date: 2026-11-04

## Entities

### Post（文章）

| 字段 | 类型 | 约束/校验 | 说明 |
|---|---|---|---|
| title | string | 必填，非空 | 标题 |
| date | ISO date | 必填，合法日期 | 发布日期，用于排序与归档 |
| tags | string[] | 可空 | 标签 |
| categories | string[] | 可空 | 分类（Hugo PaperMod 下可映射为 section/series） |
| draft | boolean | 默认 false | 草稿标记，迁移时丢弃 draft |
| body | markdown | 必填 | 正文，原样迁移不重写 |

- 来源：本地 Hexo 工程 `source/_posts/*.md`
- 关系：Post → Tags（多对多）、Post → Category（多对一）
- 校验规则：迁移后新站文章数 = 旧站归档页文章数

### LegacySite（历史站快照）

| 属性 | 值 |
|---|---|
| 位置 | `legacy/` 目录 |
| 内容 | 旧 Hexo 产物全量（含页面、css、js、medias）+ `legacy/book/` 镜像 |
| 路径基准 | 所有资源引用基于 `/legacy/`（由 Hexo `root: /legacy/` 保证） |
| 状态 | 只读快照，不再更新 |

### NewSite（新站）

| 属性 | 值 |
|---|---|
| 位置 | 仓库根路径 |
| 页面 | 首页 `/`、文章 `/posts/<slug>/`（或框架默认）、归档 `/archives/`、标签 `/tags/`、关于 `/about/` |
| 导航 | 首页 · 归档 · 知识分享(`/book/`) · 关于 · 历史版本(`/legacy/`) |
| 状态 | 活跃，日常更新入口 |

### Book（知识分享）

| 属性 | 值 |
|---|---|
| 位置 | `book/`（新站引用）+ `legacy/book/`（兜底镜像） |
| 内容 | GitBook 产物，21 个 md + SUMMARY.md |
| 状态 | 只读，随快照保留 |

## State Transitions（站点生命周期）

```text
[当前: matery 站在根路径]
   → 1. 归档: 产物以 root=/legacy/ 重新生成 → legacy/
   → 2. 换新: 新生成器产出到根路径
   → 3. 验证: quickstart.md 场景全部通过
   → 4. 稳态: 新站日常写作；legacy/ 只读
```

## Validation Rules（摘要）

- VR-1: `/legacy/` 下抽查页面（首页、2 篇文章、book）资源全部 200，无 404 资源
- VR-2: 新站文章数与旧站一致；正文 diff 为空（仅 front-matter 差异）
- VR-3: 根路径 `index.html` 为新站产物，`legacy/` 目录存在且完整
