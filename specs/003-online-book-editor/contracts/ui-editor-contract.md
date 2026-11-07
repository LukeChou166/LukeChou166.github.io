# Contract: 编辑器 UI 与交互契约

Feature: 003-online-book-editor ｜ 日期：2026-11-07 ｜ 依赖：research.md R4/R5/R7

## 路由约定（与 URL 契约的关系）

**不新增任何 hash 路由**。阅读路由仍为 `#/<book>/<chapter>.md`
（`site-src/src/scripts/reader/route.ts`）；编辑态是纯内存 UI 状态，地址栏
在进入/退出编辑时 MUST 保持不变——编辑入口因此"不可猜"（spec US1 场景 2）。

## 页面状态机（app.ts 层）

```text
reading（阅读，默认）
  └─[点击"编辑"]→ editing（编辑态）
editing ─[保存成功]→ reading（重新渲染新内容）
editing ─[保存失败/冲突]→ editing（草稿保留）
editing ─[放弃确认]→ reading
```

- `editing` 仅在 OwnerSession 状态为 `owner` 时可达；
- 无有效会话时：编辑入口在 DOM 中不存在（非 CSS 隐藏）。

## 视图元素

### 访客态 / invalid 态

- 阅读器底部（或页脚工具区）一个不显眼的固定入口：文字链"所有者登录"；
  仅此一项，无其他编辑痕迹。

### verifying 态

- 输入凭据后按钮态：`校验中…`，失败显示原因（凭据无效 / 非仓库所有者）。

### owner 态

- 章节内容头（既有 `reader-content-header`）新增两个动作：
  - 「编辑」→ 进入当前章节编辑态；
  - 「退出登录」→ 删除 `reader:owner-session`，回到访客态；
- 目录区新增「编辑目录」→ 编辑目标切换为该书 `SUMMARY.md`。

### editing 态（编辑器面板）

| 元素 | 行为 |
|------|------|
| 文本域 | 等宽字体，绑定 Draft.current；无失焦自动保存 |
| 预览面板 | 输入去抖 ~300ms → `renderMarkdown(current, bookId)`（FR-005 同管线） |
| 警示条（条件） | `bookId === "claude-code-book"` 或编辑 SUMMARY 时：同步覆盖警示，不可关闭（FR-011） |
| 「保存」 | 走保存通道（github-contents-api.md）；期间按钮禁用态"保存中…" |
| 「取消」 | dirty 时二次确认，放弃草稿回阅读态 |
| dirty 标识 | 标题旁"未保存"徽标 |

## 全局守卫（FR-009）

- 存在 dirty Draft 时：
  - 切换章节/书籍（TOC 点击、书架点击、hash 变化）→ 拦截并弹确认
    （放弃/留在编辑态）；
  - `beforeunload` → 浏览器原生确认；
  - 确认放弃后 Draft 丢弃，继续既定导航。

## 可访问性与反馈

- 保存结果以阅读器既有的 `reader-status`/`reader-error` 风格反馈，成功含
  提交链接，失败含原因摘要（ChangeRecord.detail 同源）；
- 所有新增按钮有可读 `title`；编辑态下键盘 Tab 顺序：文本域 → 预览 →
  保存 → 取消。
