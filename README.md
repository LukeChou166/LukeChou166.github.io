# luluyouyue.github.io（仓库原名，站点地址 https://lukechou166.github.io）

个人博客站点（「随笔」），基于 [Hexo](https://hexo.io/) + [hexo-theme-matery](https://github.com/blinkfox/hexo-theme-matery) 主题生成，部署在 GitHub Pages。

> 本仓库存放的是 **Hexo 构建产物**（生成的 HTML/CSS/JS），不是 Hexo 源码工程。日常发文章请在本地 Hexo 工程中写 Markdown 后 `hexo generate`，把 `public/` 目录内容同步到本仓库。

## 本地启动

纯静态站点，无需安装依赖，任选一种方式在仓库根目录启动本地服务：

```bash
# 方式一：Node.js（推荐）
npx serve -p 4000

# 方式二：Python
python3 -m http.server 4000
```

然后浏览器访问 <http://localhost:4000>。

## 目录结构

```
├── index.html          # 首页
├── archives/           # 归档
├── categories/         # 分类
├── tags/               # 标签
├── about/ contact/ friends/  # 关于/评论/友链
├── css/ js/ libs/      # 样式、脚本、第三方库
├── medias/             # 图片等静态资源
├── search.xml          # 站内搜索索引（Hexo 生成）
└── book/               # 知识分享专栏（嵌入的外部书籍）
```

## 知识分享专栏（book/）

[`book/`](book/) 通过 `git subtree` 嵌入了开源书籍仓库
[claude-code-book](https://github.com/LukeChou166/claude-code-book)（*Claude Code 深度源码解析*，纯 Markdown），
并套了一层 [Docsify](https://docsify.js.org/) 阅读壳（`book/index.html`），零构建直接渲染，
侧边栏目录来自书中的 `SUMMARY.md`。

线上访问入口：`https://lukechou166.github.io/book/`（导航栏「知识分享」）。

### 本地预览专栏

```bash
npx serve -p 4000
# 访问 http://localhost:4000/book/
```

### 自动同步（已配置 GitHub Actions）

书源仓库更新后，本仓库会自动执行 `git subtree pull` 并发布，无需手动操作：

1. **实时触发**：`claude-code-book` 仓库 push 时，通过其 `.github/workflows/notify-blog.yml`
   向本仓库发送 `repository_dispatch` 事件（需要在该仓库配置 `BLOG_PAT` Secret，见下）。
2. **兜底同步**：本仓库的 `.github/workflows/sync-book.yml` 每小时（每小时第 23 分钟）定时检查一次书源，
   有更新才提交，无更新不产生空提交。

> 首次使用实时触发需要一次性配置：在 GitHub 创建一个 Fine-grained PAT
> （仅授权 `LukeChou166/luluyouyue.github.io`，权限 Contents: Read and write），
> 然后到 `claude-code-book` 仓库的 Settings → Secrets and variables → Actions，
> 添加名为 `BLOG_PAT` 的 Secret。未配置时定时兜底依然生效。

### 手动同步

也可在本仓库 Actions 页面手动运行 "Sync book subtree"，或本地执行：

```bash
git subtree pull --prefix=book https://github.com/LukeChou166/claude-code-book.git main --squash
```

> Docsify 壳文件 `book/index.html` 是本仓库自己加的，书源中没有同名文件，同步时不会冲突。

## 部署

GitHub Pages 自动部署：把本仓库 `master` 分支推送到 `origin` 即可。

```bash
git push origin master
```

## 导航说明

由于 HTML 是 Hexo 生成的，直接在本仓库改导航时，需要同步修改所有页面
（`index.html`、`404.html`、`about/`、`archives/`、`categories/`、`contact/`、`friends/`、`tags/`、`2020/` 下所有 HTML）中的桌面导航 `ul.right.nav-menu` 和移动端侧边栏 `ul.mobile-menu-list` 两处。
