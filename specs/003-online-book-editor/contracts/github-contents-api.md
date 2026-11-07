# Contract: GitHub Contents API（编辑保存通道）

Feature: 003-online-book-editor ｜ 日期：2026-11-07 ｜ 决策来源：research.md R2

## 作用

编辑器与站点仓库之间的唯一写通道。所有请求由所有者浏览器直连平台接口，
本仓库不新增任何代理/后端。

## 固定参数

| 项 | 值 |
|----|----|
| 仓库 | `LukeChou166/LukeChou166.github.io`（2026-11-07 修正：`luluyouyue.github.io` 为改名前旧名，API 对旧名返回 301；PUT 遇 301 会被浏览器降级为 GET，MUST 直连现名，见 `doc/bug/2026-11-07-editor-repo-name-and-meta-error.md`） |
| 分支 | `master` |
| 可写前缀 | `book/`（编辑器保存路径 MUST 以 `book/` 开头，防误写其他目录） |
| 认证头 | `Authorization: Bearer <token>` |
| Accept 头 | `application/vnd.github+json` |
| API 版本头 | `X-GitHub-Api-Version: 2022-11-28` |

## 接口

### 1. 身份校验

`GET https://api.github.com/user`

- 2xx：取 `response.login`，与 `owner` 常量比对；一致 → OwnerSession 建立；
- 401：凭据无效 → 清除会话，提示重新确认。

### 2. 读取文件元数据（进入编辑态时）

`GET /repos/{owner}/{repo}/contents/{path}?ref=master`，path 逐段 URL 编码。

- 200：缓存 `sha`（更新保存用）与 `content`（Base64，可校验与阅读态原文一致）；
- 404：目标不存在 → 按**新建文件**处理，`baseSha = null`；
- 403：凭据缺少本仓库 Contents 读取权限 → 提示检查 PAT 仓库范围与权限配置；
- 401：凭据失效 → 引导退出后重新确认身份；
- 其他 4xx/5xx / 网络异常：进入编辑态失败，错误提示 MUST 包含状态码/原因，
  MUST NOT 静默吞掉（2026-11-07 修正）。

### 3. 保存（PUT 写回）

`PUT /repos/{owner}/{repo}/contents/{path}`

```jsonc
{
  "message": "edit(book): update agent-papers/OpenHands_zh.md via web editor",
  "content": "<Base64(UTF-8 文件全文)>",
  "branch": "master",
  "sha": "<进入编辑态时缓存的 sha>"   // 新建文件时省略
}
```

commit message 模板：
- 更新：`edit(book): update <bookId>/<path> via web editor`
- 新建：`edit(book): create <bookId>/<path> via web editor`

### 响应 → UI 分支映射（FR-006/007/011）

| 状态 | 含义 | UI 行为 |
|------|------|---------|
| 200/201 | 保存成功 | 记录 ChangeRecord(success)，更新 baseSha = 新 sha，回阅读态 |
| 409 | sha 过期（并发修改） | result=conflict：提示"远端已更新"，草稿保留，提供"拉取最新/放弃"操作；MUST NOT 带旧内容重试覆盖 |
| 401 | 凭据失效 | 清除 OwnerSession → none；草稿保留，引导重新确认后重试 |
| 403 | 权限不足/超限 | result=failed：展示响应 message；草稿保留 |
| 422 | 参数/路径非法 | result=failed：展示 message；重点检查路径前缀 `book/` |
| 网络/5xx | 请求未达成 | result=failed：可原样重试（幂等：PUT + 固定 sha） |

## 约束

- token MUST NOT 出现在任何 URL、日志（ChangeRecord.detail 只存状态码与
  message 摘要）、页面 DOM（FR-002/012）；
- 保存内容 MUST 为文件**全文**（Contents API 语义），编辑器不做局部补丁；
- 文件大小上限沿用平台限制（~100MB，远超 book 场景的 60KB+ 量级）。
