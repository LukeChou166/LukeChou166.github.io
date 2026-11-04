# luke的个人博客（仓库原名，站点地址 https://lukechou166.github.io ）

个人博客站点（「随笔」），基于 [Astro](https://astro.build/) + [AstroPaper](https://github.com/satnaing/astro-paper) 主题，部署在 GitHub Pages。

> 站点源码在 `site-src/` 目录（Astro 工程）；仓库根目录是 **构建产物**，由 `site-src` 构建后拷贝而来。
> 旧版博客（Hexo + Matery）完整保存在 `legacy/` 目录，可从导航「历史版本」访问。

## 日常写文章

在 `site-src/src/content/posts/` 下新建 Markdown 文件（frontmatter 参考 `site-src/src/content/pages/about.md` 同级目录下的现有文章），然后构建发布：

```bash
cd site-src
npm install        # 首次需要
npm run build      # astro check + astro build + pagefind 搜索索引
cp -R dist/. ..    # 把构建产物同步到仓库根目录
git add -A && git commit -m "publish" && git push origin master
```

## 本地启动

```bash
# 预览整站（新站 + legacy 归档 + book，推荐）
python3 -m http.server 4000

# 只调新站源码（热更新）
cd site-src && npm run dev
```

## 目录结构

```
├── index.html posts/ archives/ tags/ about/ search/   # 新站产物（Astro 生成）
├── _astro/ pagefind/ sitemap*.xml rss.xml robots.txt  # 新站资源与搜索索引
├── legacy/           # 旧版博客整站归档（Hexo + Matery，只读）
│   └── book/         # book 的兜底镜像
├── book/             # 知识分享专栏（Docsify，保持根路径）
├── site-src/         # Astro 源码工程（内容、主题配置、构建）
└── specs/            # 基于 spec 的开发文档（001-blog-redesign）
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

新站导航在 `site-src/src/components/Header.astro`（含「知识分享」「历史版本」入口），
站点信息（标题/作者/链接）在 `site-src/astro-paper.config.ts`。
