# Research: 003-online-book-editor

日期：2026-11-07 ｜ 状态：全部 NEEDS CLARIFICATION 已解决（spec 无遗留标记，
本文件记录技术选型决策）

## R1 所有者身份确认机制

**Decision**: 所有者在浏览器中手动录入 GitHub 细粒度 PAT（仅授予
`LukeChou166/luluyouyue.github.io` 的 Contents 读写权限），前端调用
`GET /user` 获取账号 login，与配置的 owner（`LukeChou166`）比对，一致则
建立 OwnerSession 存入 localStorage。

**Rationale**:
- 满足 FR-002（凭据只存本地）与 FR-003（确为仓库所有者）；
- 细粒度 PAT 天然限定"单仓库 + Contents 读写"最小权限，泄露影响面可控；
- 纯静态站点无后端可托管 OAuth 回调与密钥交换。

**Alternatives considered**:
- OAuth App web application flow：需要 client_secret 做令牌交换，纯静态
  站点无处安全保存 secret；GitHub 已弃用纯前端 implicit flow（令牌落在
  URL fragment，直接违反 FR-002）。否决。
- Device Flow：`/login/device/code` 端点不开放浏览器 CORS，纯前端不可用。
  否决。
- 基于 cookie 的第三方托管登录：引入外部服务，违反宪法原则 II。否决。

## R2 保存通道与冲突校验

**Decision**: 使用 GitHub Contents API：
- 读元数据：`GET /repos/{owner}/{repo}/contents/{path}?ref=master` 取当前
  `sha`（编辑态进入时缓存该值）；
- 写回：`PUT /repos/{owner}/{repo}/contents/{path}`，body 含 `message`、
  `content`（Base64）、`sha`；新文件不带 `sha`；
- 远端 `sha` 与本地缓存不一致 → 平台返回 409 → 按"冲突"分支处理
  （FR-006：不覆盖、保留草稿、提示重新拉取）。

**Rationale**: 单文件提交语义与"编辑一章 = 改一个文件"一一对应；409 即
天然冲突检测，无需自建版本管理；`api.github.com` 支持浏览器 CORS。

**Alternatives considered**:
- Git Data API（tree/commit 三步组合）：可一次提交多文件，但流程复杂，
  v1 单文件编辑用不上；留作 FR-008 批量目录改造的后续演进项。
- 让所有者复制内容回本地手工提交：不是"在线编辑"，直接否决。

**补充约束**（契约见 `contracts/github-contents-api.md`）：
- 请求头 `Authorization: Bearer <token>`、`Accept: application/vnd.github+json`；
- commit message 模板：`edit(book): update <bookId>/<path> via web editor`；
- 401/403（凭据失效/权限不足）→ 清除会话并引导重新确认，草稿保留。

## R3 编辑预览渲染管线

**Decision**: 编辑预览直接复用 `site-src/src/scripts/reader/markdown.ts`
的 `renderMarkdown(md, bookId)`，输入去抖（约 300ms）触发渲染。

**Rationale**: FR-005 要求预览与阅读态一致——同一函数是唯一可靠保证；
零新依赖。

**Alternatives considered**: 引入 CodeMirror/Milkdown 等编辑器库的独立预览
→ 新依赖 + 渲染管线不一致风险，违反原则 II。否决。

## R4 编辑器形态与模块划分

**Decision**: 原生 `<textarea>` 纯文本编辑（等宽字体、tab 缩进）+ 右侧
预览面板；新增 `site-src/src/scripts/reader/editor/` 子模块（auth.ts /
editor.ts / save.ts），`app.ts` 仅做挂载与守卫接线。

**Rationale**: spec A4 已定纯文本；reader 现有代码即是"自研粘合"规模，
编辑模块按同标准控制体量，每个文件单一职责。

**Alternatives considered**: CodeMirror 6（体验好但 +200KB 依赖，v1 不值得）；
改造为 URL hash 编辑路由（暴露编辑入口于地址栏，与 FR-001"不可猜"冲突）。
均否决。

## R5 访客零暴露的实现边界

**Decision**: 编辑能力由**运行时状态**保证不可见：
- 无有效 OwnerSession → 编辑入口/按钮/编辑态根本不渲染（DOM 中不存在，
  非仅 CSS 隐藏）；
- 不新增编辑 URL/hash 路由，编辑态无法通过拼地址进入；
- 保存通道本身需要 PAT，访客无凭据时任何"控制台触发保存"必然 401 失败
  且不改动远端（spec US1 场景 3）；
- 打包产物中包含编辑模块代码是可接受边界（见 plan.md Structure Decision）。

**Rationale**: 纯静态站点无法对代码保密，安全边界必须落在**凭据与平台
权限**上，前端隐藏仅是体验层要求。

## R6 站点配置（owner/repo）

**Decision**: 在 reader 内新增编辑配置常量：`owner = "LukeChou166"`、
`repo = "LukeChou166.github.io"`、`branch = "master"`；owner 与
`astro-paper.config.ts` 的 `site.profile` 对应账号一致，v1 不做跨文件
联动，改动时需同步两处（在常量处注释说明）。
（2026-11-07 修正：repo 初版误写为改名前旧名 `luluyouyue.github.io`，
旧名 301 会导致 PUT 降级失败，已改为与 git remote 一致的现名，
见 `doc/bug/2026-11-07-editor-repo-name-and-meta-error.md`。）

**Alternatives considered**: 构建期注入环境变量——增加构建复杂度，
收益仅是少一处常量。否决。

## R7 自动同步书籍警示（FR-011）

**Decision**: 书籍 id 为 `claude-code-book` 时，编辑态顶部渲染固定警示条
（不可关闭）："该书由 GitHub Actions 每小时从书源仓库镜像同步，此处的
手动修改会被下一次同步覆盖"，并附 `.github/workflows/sync-book.yml` 的
机制说明链接（站内 specs 路径）。

**Rationale**: spec A3 豁免已接受该张力；警示是最低成本的知情保障。

## R8 编辑日志（FR-012）

**Decision**: 保存尝试（时间/文件/结果/失败原因）写入 localStorage
环形日志（保留最近 50 条），仅本浏览器可读，不接任何上报。

**Rationale**: 满足 FR-012 的同时给所有者失败排查抓手，成本极低。
