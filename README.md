# luke的个人博客（仓库原名，站点地址 https://lukechou166.github.io ）

个人博客站点（「随笔」），基于 [Astro](https://astro.build/) + [AstroPaper](https://github.com/satnaing/astro-paper) 主题，部署在 GitHub Pages。

**首页即知识分享**：首页是一个多书阅读器——左侧目录、右侧章节内容，支持多本书
（详见下文「知识分享专栏」）。博客文章在 `/posts/`。

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
├── index.html                 # 首页 = 知识分享阅读器（Astro 页面 + 客户端渲染）
├── posts/ archives/ tags/ about/ search/   # 博客（Astro 生成）
├── _astro/ pagefind/ sitemap*.xml rss.xml robots.txt  # 资源与搜索索引
├── book/                      # 知识分享（多书）
│   ├── books.json             # 书籍清单（新增书在此登记）
│   ├── index.html             # 旧 /book/ 入口的兼容跳转页
│   └── claude-code-book/      # subtree 同步的书籍（SUMMARY.md + 章节 md）
├── legacy/                    # 旧版博客整站归档（只读）
│   └── book/                  # book 的兜底镜像
├── site-src/                  # Astro 源码工程（阅读器源码 src/scripts/reader/）
└── specs/                     # 基于 spec 的开发文档
```

## 知识分享专栏（首页阅读器）

首页就是阅读器：左侧目录来自各书的 `SUMMARY.md`（若 SUMMARY 无链接，则用
`books.json` 的 `chapters` 清单），右侧渲染章节 Markdown；每章有「查看源文件」
直达原始 md。章节路由为 hash（`/#/<书>/<章节>.md`），刷新可恢复位置。

### 新增一本书（零代码）

1. 在 `book/<slug>/` 放入书籍：`SUMMARY.md` + 章节 md（SUMMARY 里写
   `[章节名](./章节.md)` 链接列表；没有链接清单也可在 books.json 写 `chapters`）
2. 在 [`book/books.json`](book/books.json) 登记一条（id 必须等于目录名）
3. 完成——刷新首页即出现在书架，无需改任何代码、无需重新构建

### 书籍同步（git subtree）

现有书籍通过 `git subtree` 嵌入：`book/claude-code-book/` 来自
[claude-code-book](https://github.com/LukeChou166/claude-code-book)。
`.github/workflows/sync-book.yml` 自动同步（repository_dispatch 实时触发 +
每小时兜底）。**书籍内容更新无需重新构建站点**——阅读器运行时读取 md。

> 外部仓库 claude-code-book 的 notify 工作流如检查本仓库路径，需同步更新为
> `book/claude-code-book/`；未更新前实时触发会失效，每小时兜底依然有效。

### 手动同步

```bash
git subtree pull --prefix=book/claude-code-book https://github.com/LukeChou166/claude-code-book.git main --squash
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
