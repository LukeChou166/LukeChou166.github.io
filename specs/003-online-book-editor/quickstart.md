# Quickstart: 003-online-book-editor 端到端验证

日期：2026-11-07 ｜ 前置阅读：[contracts/](contracts/)、[data-model.md](data-model.md)

## 前提

1. 本地环境：Node ≥ 22、Python3；
2. 依赖已装：`cd site-src && npm install`；
3. **细粒度 PAT**：GitHub → Settings → Developer settings → Fine-grained
   tokens → 仅勾选仓库 `LukeChou166/luluyouyue.github.io`，权限
   `Contents: Read and write`（过期时间自定）；
4. 本地服务：仓库根目录 `python3 -m http.server 4000`
   （需含已构建的 `site-src/dist` 产物，或直接在 `http://localhost:4321`
   跑 `npm run dev`）。

> 注意：本地保存会把提交推到**真实仓库** master 并触发线上部署。若只想
> 走通流程，可先把 token 权限设为只读（预期 403 分支），或使用 fork 测试。

## 场景 1：访客零暴露（spec US1 / SC-001）

1. 无痕窗口打开 `http://localhost:4000/`；
2. **预期**：页面无"编辑/保存/编辑目录"任何元素；检查 DOM（DevTools）确认
   非 CSS 隐藏；地址栏无编辑相关路由；
3. 手工在控制台执行 `localStorage.setItem('reader:owner-session', '{}')`
   后刷新 → **预期**：复核失败降级访客态（无编辑入口）。

## 场景 2：所有者登录 → 编辑 → 预览（spec US2 / SC-002）

1. 正常窗口打开站点，点击"所有者登录"，粘贴 PAT；
2. **预期**：校验通过（约 1 秒），章节头出现「编辑」；刷新页面无需重新登录；
3. 打开 `agent-papers` 任一章节 → 点「编辑」→ 修改一段文字；
4. **预期**：预览面板实时更新且与阅读态渲染一致；标题旁出现"未保存"徽标。

## 场景 3：保存 → 提交 → 上线（spec US3 / SC-003/004）

1. 在场景 2 基础上点「保存」；
2. **预期**：成功反馈含提交链接；GitHub 仓库出现
   `edit(book): update agent-papers/<file> via web editor` 提交；
3. 3-5 分钟后（Actions Pages 部署完成）刷新线上章节 → **预期**：内容为
   编辑后版本；
4. 打开 DevTools → Application → localStorage：`reader:edit-log` 新增一条
   `success` 记录，且任何键中**均不含 token**。

## 场景 4：冲突保护（spec US3 场景 3 / FR-006）

1. 进入某章节编辑态（缓存 baseSha），**不要关页面**；
2. 另一途径（命令行或 GitHub 网页）修改同一文件并推送；
3. 回到编辑器点「保存」；
4. **预期**：409 → 明确"远端已更新"提示，编辑内容仍在编辑区；选择
   "拉取最新"后 baseSha 更新，可再次保存成功；全程无静默覆盖。

## 场景 5：未保存守卫（spec US4 / FR-009）

1. 制造 dirty 草稿后点击 TOC 其他章节 / 切换书籍 / 直接关闭标签页；
2. **预期**：前两者弹确认（放弃才离开）；关闭标签页触发浏览器
   beforeunload 确认；确认放弃后草稿丢弃。

## 场景 6：目录编辑与同步警示（spec US4 / FR-008/011）

1. owner 态下点「编辑目录」→ 修改 `agent-papers/SUMMARY.md` 增加一行
   指向已有章节的链接 → 保存；
2. **预期**：保存成功且刷新后目录出现新章节（TOC 重新加载）；
3. 切到 `claude-code-book` 进入编辑 → **预期**：顶部出现不可关闭的
   同步覆盖警示条。

## 场景 7：交付门禁（宪法原则 IV）

```bash
cd site-src
npm run build        # astro check + astro build + pagefind，零错误
```

根目录静态服务抽查：`/`、`/book/agent-papers/OpenHands_zh.md`、`/legacy/`、
404 页可达（`/book/` 为兼容跳转页）。

## 常见失败排查

| 现象 | 排查 |
|------|------|
| 保存 403 | PAT 权限未含 Contents RW，或仓库选错 |
| 保存 409 | 场景 4 的正常冲突分支，非 bug |
| 登录后仍无编辑入口 | DevTools 查看 `reader:owner-session` 的 login 是否等于配置 owner |
| 预览与阅读态渲染不一致 | 检查是否绕过了 `renderMarkdown`（契约：ui-editor-contract.md） |
