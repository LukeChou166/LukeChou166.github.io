# Phase 1 Data Model: 首页即知识分享（多书阅读器）

Feature: 002-knowledge-home | Date: 2026-11-04

## Entities

### Book（书籍）

| 字段 | 类型 | 约束/校验 | 说明 |
|---|---|---|---|
| id | string | 必填，唯一，`[a-z0-9-]+` | 书籍标识，等于目录名 `book/<id>/` |
| title | string | 必填非空 | 展示名 |
| description | string | 可空 | 书架上的简介 |
| defaultChapter | string | 默认 `README.md` | 打开书籍时首先渲染的章节 |
| order | number | 可选，默认按清单顺序 | 书架排序 |

- 物理形态：`book/<id>/SUMMARY.md` + 章节 md + 静态资源（图片等）
- 登记：`book/books.json`（契约见 contracts/books-json.md）
- 校验：目录存在且含 `SUMMARY.md` 才被视为有效书；清单中缺失目录 → 控制台
  警告并跳过（不渲染该卡片的死链接）

### Chapter（章节）

| 字段 | 类型 | 说明 |
|---|---|---|
| path | string | 相对书目录的 md 路径（如 `01-architecture-overview.md`） |
| title | string | SUMMARY.md 条目文本 |
| depth | number | SUMMARY.md 标题层级 → 目录缩进级别 |
| state | enum | `idle \| loading \| rendered \| missing` |

- 来源：解析 `book/<id>/SUMMARY.md` 的链接列表（`[标题](path.md)`），
  忽略非 `.md` 链接与外部链接
- 转移：`idle → loading`（点击/定位）→ `rendered`（fetch+渲染成功）/
  `missing`（404）

### Reader（阅读器状态）

| 状态 | 说明 |
|---|---|
| currentBook | 当前书 id；初始 = URL hash 中的书 > 上次阅读（localStorage） > 清单第一本 |
| currentChapter | 当前章节 path；初始 = 书的 defaultChapter |
| books | books.json 解析结果 |
| toc | 当前书的章节列表 |

- 路由：`#/<book>/<chapter>.md`；无 hash → 按初始规则推导并 replaceState
- 切换书：重置 currentChapter 并重渲染目录

## State Transitions（整体）

```text
[现状: 首页=博客列表, book/=单书 Docsify]
   → 1. 书籍迁移: book/ → book/claude-code-book/（文件零修改）
   → 2. 新增 books.json + 顶层跳转页 book/index.html
   → 3. 首页重写为阅读器（Astro 页面 + 客户端渲染）
   → 4. sync-book.yml prefix 改为 book/claude-code-book
   → 5. 验证 quickstart.md 场景 → 发布
```

## Validation Rules（摘要）

- VR-1: 首页左侧目录条目与 `book/claude-code-book/SUMMARY.md` 链接数一致
- VR-2: 点击任一目录项，内容区渲染对应 md 且 hash 变化；刷新后位置保持
- VR-3: `book/books.json` 新增一本书登记 + 对应目录 → 首页书架出现该书（无需改代码）
- VR-4: `/book/` 访问跳转到阅读器并选中 claude-code-book
- VR-5: `npm run build` 零错误；博客 `/posts/` 列表/文章/搜索不回归
- VR-6: 章节 md 内相对图片/链接按 `/book/<id>/` 基准正确解析
