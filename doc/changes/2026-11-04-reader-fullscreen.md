# 变更存档：阅读器首页未占满全屏

- **类型**: bug（UI 布局缺陷）
- **日期**: 2026-11-04
- **用户原始描述**: "怎么网页占用没有全屏，定位 & 修复"

## 根因分析

- AstroPaper 主题的 `app-layout` 容器定义为 `max-w-3xl`（768px）居中
  （`site-src/src/styles/global.css:25-31`），是为窄栏博客设计的
- 首页阅读器 `main` 继承了该容器 → 宽屏下两侧大片留白
- 正文高度随内容增长，目录/内容不占满视口高度，页脚直接顶上来
- 关联文件：`site-src/src/pages/index.astro`（main class 与布局样式）、
  `site-src/src/components/Header.astro`（同样使用 app-layout）

## 修复方案

- `index.astro`：main 改用自定义 `.reader-page`（`max-width: none` 全宽，
  `padding-inline: clamp(1rem, 3vw, 2.5rem)`）；`.reader-layout` 高度
  `calc(100dvh - 7.5rem)`，目录与内容各自 `overflow-y: auto` 内部滚动，
  页脚退到第二屏；移动端（≤768px）恢复正常文档流 + 抽屉
- `Header.astro`：新增 `wide` prop，首页传 `<Header wide />` 使导航条同样全宽，
  其他页面不受影响

## 验证

- 本地 Playwright 1600×900：main 宽 1600/1600，layout 高 780/900，页脚在第二屏
- 375×700：抽屉隐藏、菜单按钮正常（FR-008 无回归）
- 已提交推送（`717f2fa` + 清理 `f7d6159`），线上 CSS 已更新为新构建
  （`/_astro/index.CS9DclwV.css`），首页 HTML 含 `reader-page`

## 备注

- 修复过程中 `git add -A` 曾把本地调试目录 `.playwright-cli/` 重新带入版本库
  （`717f2fa`），已由 `f7d6159` 从索引移除；`.gitignore` 现已包含
  `.playwright-cli/`、`home.yaml`、`reader-desktop.png`

## 回归记录（2026-11-06）

- 提交 `fb1bf54`（书籍手动镜像同步）因暂存区混入**修复前的旧版
  index.astro/Header.astro**，全屏布局被回退，线上再次变窄
- 修复：`100c85f` 重新提交工作区中的全屏版源码并重建产物；已验证线上
  `reader-page` 与新 CSS（`index.CS9DclwV.css`）恢复
- 教训：多分支/多编辑器并行时，提交前先 `git pull` 并确认暂存内容
  （`git diff --cached`），避免旧文件覆盖新修复
