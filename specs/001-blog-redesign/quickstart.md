# Quickstart: 博客改版验证指南

Feature: 001-blog-redesign | Date: 2026-11-04

前置条件：本仓库克隆到本地；无需安装运行时依赖（验证归档/新站产物只需静态服务）。

```bash
cd /Users/zhouli/Documents/work_space/luluyouyue.github.io
npx serve -p 4000     # 或 python3 -m http.server 4000
```

## 场景 1：老站归档可用（US1）

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1.1 | 打开 `http://localhost:4000/legacy/` | 旧 matery 首页，样式与改版前一致 |
| 1.2 | 打开归档页中任意一篇文章 | 正文、图片、代码高亮正常 |
| 1.3 | 打开 `http://localhost:4000/legacy/book/` | GitBook 知识分享可浏览 |
| 1.4 | 检查页面源码 | 无 `href="/css/`、`src="/medias/` 残留（资源均带 `/legacy/` 前缀） |

## 场景 2：新站上线（US2/US3）

| 步骤 | 操作 | 预期 |
|---|---|---|
| 2.1 | 打开 `http://localhost:4000/` | 新主题首页（非 matery 样式） |
| 2.2 | 点击导航「历史版本」 | 跳转 `/legacy/` |
| 2.3 | 点击导航「知识分享」 | 跳转 `/book/` |
| 2.4 | 随机打开 3 篇新站文章 | 正文与旧文一致，标题/日期/标签保留 |
| 2.5 | 访问一个不存在的路径 | 404 页出现且含「历史版本」入口 |

## 场景 3：性能（SC-002）

```bash
# Chrome DevTools → Lighthouse → Performance（移动端模拟）
```

预期：新站首页 Performance ≥ 90；对比归档站（旧站）作为基线。

## 场景 4：内容完整性（SC-003）

- 打开 `/legacy/archives/` 记录旧文章总数 N
- 打开新站归档页确认文章数 ≥ N（新站可能新增文章）
- 抽查 3 篇文章正文与旧版 diff，仅允许 front-matter 差异

## 失败排查

- `/legacy/` 样式丢失 → 资源路径残留根绝对路径，回到 research.md R2 重新生成
- 新站文章缺图 → 旧文图片引用 `/medias/`，迁移时改为新站图床/资源目录
