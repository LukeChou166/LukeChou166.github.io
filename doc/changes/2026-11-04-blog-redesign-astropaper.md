# 变更存档：博客改版（Hexo/Matery → Astro/AstroPaper）

- **类型**: feature
- **日期**: 2026-11-04
- **Spec 流程**: `specs/001-blog-redesign/`（spec / plan / research / data-model / contracts / quickstart）

## 背景

旧博客（Hexo 4.2.1 + hexo-theme-matery）视觉偏重、组件化痕迹明显，用户认为
"页面有点丑"，要求：① 老博客整体放入历史空间；② 提供多个"简单、美观、大气、
低调而有内涵"的候选方案。经选型（Hugo+PaperMod / Astro+AstroPaper /
Hexo+cupertino / Eleventy 对比，见 research.md），确定采用 **Astro + AstroPaper**。

## 技术方案

- **归档**：本地无 Hexo 源码工程，无法用 `root: /legacy/` 重新生成，改用产物
  路径改写：`git mv` 旧站到 `legacy/`，再对全部 HTML 执行 `="/` → `="/legacy/`
  前缀改写；`book/` 保留根路径并镜像 `legacy/book/` 兜底。
- **新站**：`degit satnaing/astro-paper` 脚手架到 `site-src/`，配置中文站点
  （`lang: zh`、Asia/Shanghai、UI 字符串中文化、导航加「知识分享」「历史版本」、
  404 页加历史版本入口）。
- **内容迁移**：临时脚本（cheerio + turndown）从 `legacy/2020/**/index.html`
  的 `#articleContent` 反解 5 篇文章为 Markdown；自定义规则处理 hexo 代码高亮
  表格（`figure.highlight`）与标题锚点；正文图片指向 `/legacy/medias/` 复用归档资源。
- **构建适配**：移除 Google Fonts 在线字体（网络不可达，改中文系统字体栈）、
  删除动态 OG 图片路由（`og.png.ts`、`posts/[...slug]/index.png.ts`）、
  astro i18n 注册 `zh` 为默认 locale（URL 无前缀）。

## 变更文件清单

- **归档移动**（git mv + 路径改写，122 个文件 R）：
  `index.html`、`404.html`、`2020/`、`about/`、`archives/`、`categories/`、
  `contact/`、`css/`、`friends/`、`js/`、`libs/`、`medias/`、`search.xml`、
  `tags/`、`favicon.png`、`未命名绘图.drawio` → `legacy/` 下同名路径
- **新增**：
  - `site-src/`（AstroPaper 工程，node_modules/dist 已 gitignore）
  - `site-src/src/content/posts/*.md`（5 篇迁移文章：hello-world、bert、
    caffe-source-code-reading、caffe-source-code-reading2、hexoblog）
  - `site-src/src/content/pages/about.md`（中文重写）
  - `site-src/astro-paper.config.ts`、`site-src/astro.config.ts`（站点配置）
  - `site-src/src/i18n/lang/zh.ts` + `en.ts`、`src/i18n/types.ts`（中英 UI 字符串）
  - `site-src/src/components/Header.astro`、`site-src/src/pages/404.astro`（导航/入口）
  - `site-src/src/styles/theme.css`（系统字体栈）
  - `site-src/public/favicon.png`
  - 根目录新站产物：`index.html`、`posts/`、`_astro/`、`pagefind/`、
    `search/`、`sitemap*.xml`、`rss.xml`、`robots.txt`、`favicon.svg`、
    `default-og.jpg`、新 `about/`、`archives/`、`tags/`、`404.html`
  - `specs/001-blog-redesign/`（本 feature 全部设计文档）
  - `.specify/memory/constitution.md`（v1.0.0 项目宪法）
  - `.gitignore`（site-src 产物忽略 + .codebuddy）
- **修改**：`README.md`（新架构与写作流程说明）

## 主要更改内容

1. 旧站整站快照进 `legacy/`，资源路径自洽，导航/404 均可回到历史版本。
2. 仓库根路径由 Astro 构建产物替换：单栏极简新站 + pagefind 搜索 + RSS/sitemap。
3. 写作流程变为：`site-src/src/content/posts/` 写 Markdown →
   `npm run build` → `cp -R dist/. ..` → push（README 已更新）。
4. `book/` 及其自动同步工作流不受影响。

## 验证

- `npm run build`（astro check + build + pagefind）零错误，索引 5 页 816 词
- 本地 `python3 -m http.server` 抽查 12 条路径全部 200（含 `/legacy/`、
  `/legacy/2020/.../caffe-source-code-reading/`、`/legacy/book/`、`/book/`、404）
- legacy 内无根绝对路径残留（grep 验证）；浏览器预览新旧两站样式正常
