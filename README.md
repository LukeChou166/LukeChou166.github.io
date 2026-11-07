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
│   ├── claude-code-book/      # 自动镜像同步的书籍（SUMMARY.md + 章节 md）
│   └── agent-papers/          # Agent 论文翻译/笔记（手动维护，见下文）
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

> 注意：即使目录由 `books.json` 的 `chapters` 清单提供章节，`SUMMARY.md` 也必须
> 存在——阅读器会先对该文件发 HEAD 请求做校验，404 会直接跳过该书
> （见 `site-src/src/scripts/reader/app.ts` 的 `validateBook`）。

### 给已有书籍添加章节（以 agent-papers 为例）

`book/agent-papers/` 是手动维护的论文翻译/笔记集，添加一篇论文的步骤：

1. 把论文 md 放进 `book/agent-papers/`（如 `OpenHands_zh.md`）
2. 在 `book/agent-papers/SUMMARY.md` 追加一行链接：
   `- [论文标题](文件名.md)`（目录按行内顺序展示，无需改 `books.json`）
3. 首次添加新书目录时，还需在 `book/books.json` 登记（id = 目录名，
   `defaultChapter` 指向首篇，`order` 控制书架排序）
4. 提交推送即上线（阅读器运行时读取 md，不用重新构建）：

```bash
git add book/ && git commit -m "add paper: <标题>" && git push origin master
```

### 书籍同步（自动镜像）

书籍内容来自 [claude-code-book](https://github.com/LukeChou166/claude-code-book)。
`.github/workflows/sync-book.yml` 每小时（第 23 分钟）将书源仓库**镜像**到
`book/claude-code-book/`，有变化才提交推送，**无需重新构建站点**——阅读器
运行时读取 md，同步即上线。

> 早期版本用 `git subtree pull` 同步；书籍目录迁移到子目录后 subtree 合并
> 元数据失效，冲突被静默吞掉导致"看起来成功但没拉代码"，已于 2026-11-06
> 改为镜像方式（见 `doc/changes/2026-11-06-book-sync-broken.md`）。
> Docsify 阅读壳 `book/claude-code-book/index.html` 是本仓库维护的文件，
> 同步时自动保留。

## 部署

GitHub Pages 自动部署：把本仓库 `master` 分支推送到 `origin` 即可。

```bash
git push origin master
```

## 导航说明

新站导航在 `site-src/src/components/Header.astro`（含「知识分享」「历史版本」入口），
站点信息（标题/作者/链接）在 `site-src/astro-paper.config.ts`。
