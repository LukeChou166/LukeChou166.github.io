# Phase 0 Research: 博客改版选型调研

Feature: 001-blog-redesign | Date: 2026-11-04

审美目标：**简单、美观、大气、低调而有内涵** —— 单栏/窄栏排版优先、大留白、低饱和配色（黑白灰 + 单点缀色）、少动效、无重型 JS、衬线/优质无衬线中文字体、内容为王。

---

## R1. 新博客候选方案（≥3，覆盖不同技术栈）

### 方案 A：Hugo + PaperMod ⭐ 推荐

- **Decision**: 首选方案
- **风格**: 经典黑白极简，单栏列表 + 大标题，暗色模式原生支持。最符合"大气低调有内涵"，Google 搜索其 demo 即可感受。
- **优点**:
  - PaperMod 是最流行的极简 Hugo 主题，文档全、社区活跃、长期维护
  - 构建速度极快（毫秒级），产物零 JS 框架依赖，Lighthouse 轻松 95+
  - 目录结构简单（content/posts + config.yaml），维护心智负担最低
- **缺点/成本**:
  - 需从 Hexo 迁到 Hugo：front-matter 字段映射（date/tags/categories 基本同名，工作量小）、短代码语法需检查
  - 中文字体需自行配置（引入系统字体栈或思源黑体 CDN）
- **Alternatives considered**: Hugo + Stack（卡片风偏花哨）、hugo-theme-terminal（终端风过于geek，不够"大气"）、hugo-bearblog（极简但样式略糙）

### 方案 B：Hexo + cupertino / keep 主题（改动最小）

- **Decision**: 保守备选（若不想换生成器）
- **风格**: cupertino 单栏苹果系极简、白底细字；keep 主题简洁大方、开箱即用
- **优点**:
  - 沿用现有本地 Hexo 工程与写作流程，**换主题即可**，文章零迁移
  - 与旧站同构，`root: /legacy/` 归档与 `root: /` 新站可用同一工程两次生成
- **缺点/成本**:
  - Hexo 生态节奏放缓，主题更新不如 Hugo/Astro 活跃
  - cupertino 社区规模小，遇到问题靠自己多
- **Alternatives considered**: hexo-theme-stellar（功能多但偏"组件化"，正是旧站 matery 被嫌弃的同类问题）、hexo-theme-fluid（渐变风偏热闹）

### 方案 C：Astro + AstroPaper ⭐ 推荐（若愿接受新栈）

- **Decision**: 进取备选
- **风格**: 内容型极简博客模板，排版考究、暗色模式、搜索/标签/归档齐全，Lighthouse 四项 100
- **优点**:
  - 现代技术栈（组件化 + 零默认 JS），后续想加页面/功能扩展性最强
  - Markdown 即内容，迁移与 Hugo 成本相当
- **缺点/成本**:
  - 需要 Node 生态依赖（npm install），构建比 Hugo 慢
  - 对非前端作者而言，Astro 心智成本略高于 Hugo 配置文件
- **Alternatives considered**: Astro + fuwari（动效丰富、色彩明快，不够"低调"）

### 方案 D：Eleventy + 手写排版（极致控制，不推荐首选）

- **Decision**: 保留记录，不推荐
- **风格**: 完全手工排版，最"内涵"，但全靠作者审美与耐心
- **缺点/成本**: 需自己写模板/分页/RSS/归档，工作量数倍于现成主题；违背"简单优先"原则

### 选型结论

| 维度 | A Hugo+PaperMod | B Hexo+cupertino | C Astro+AstroPaper |
|---|---|---|---|
| 审美契合 | ★★★★★ | ★★★★ | ★★★★★ |
| 迁移成本 | 中 | 低 | 中 |
| 维护成本 | 低 | 中 | 中低 |
| 性能 | ★★★★★ | ★★★★ | ★★★★★ |
| 生态活跃 | ★★★★★ | ★★★ | ★★★★ |

**推荐顺序：A → C → B**。若作者希望零迁移风险，退而选 B。

---

## R2. 老博客归档方案

- **Decision**: 在本地 Hexo 工程中以 `root: /legacy/` 重新 `hexo generate`，产物整体放入本仓库 `legacy/` 目录；`book/` 镜像一份到 `legacy/book/` 兜底
- **Rationale**: 旧产物大量使用根绝对路径（`/css/matery.css`、`/medias/...`），直接平移到子目录必然断链；用生成器参数改 root 是唯一可靠方式
- **Alternatives considered**:
  - 直接把现有产物拷入 `legacy/` 并 sed 改写 `href="/`→`href="/legacy/`（风险：srcset、og:image、JS 内拼接路径易漏改，不推荐）
  - 独立仓库/子域名归档（引入额外维护面，没必要）
- **注意**: 搜索、评论等依赖外部服务的功能在归档站可失效，属可接受降级

## R3. book 知识分享的去留

- **Decision**: 新站保留 `book/` 在 `/book/` 路径（内容仍有价值，GitBook 风格与新站独立），导航加「知识分享」入口；同时在 `/legacy/book/` 留兜底镜像
- **Rationale**: 两者成本都极低（拷贝目录），最大化链接可生存性

## R4. 旧链接兼容

- **Decision**: 不逐条做 301（GitHub Pages 无服务端重写，JS/meta refresh 逐页跳转维护成本高）；采用「404 页兜底 + 归档入口」策略：新站 404 页提示并链接 `/legacy/` 与站内搜索
- **Rationale**: 个人博客外链量有限，ROI 最高的方案；若后续有高价值被链文章，可单独在该路径放 meta-refresh 跳板页

## R5. 新站内容迁移

- **Decision**: 从本地 Hexo 工程 `source/_posts/*.md` 取原文（front-matter 重映射为目标框架格式），**不**从 HTML 反解
- **Fallback**: 若源工程不可得，用 pandoc/turndown 从 `/legacy/` 的文章 HTML 反解 Markdown（质量次之，仅保底）
