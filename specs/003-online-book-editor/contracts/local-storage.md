# Contract: localStorage 键（编辑模块）

Feature: 003-online-book-editor ｜ 日期：2026-11-07

reader 既有键 `reader:last`（route.ts）不变。本特性新增键统一带
`reader:` 前缀；所有读写 MUST try/catch 兜底（隐私模式，与 route.ts 一致）。

## 键清单

| 键 | 值 | 写入方 | 生命周期 |
|----|----|--------|----------|
| `reader:owner-session` | `{"token":"…","login":"LukeChou166","verifiedAt":"2026-11-07T…Z"}` | editor/auth.ts | 建立/复核成功时写入；401 或用户主动退出时删除 |
| `reader:edit-log` | ChangeRecord[]（最多 50 条，新的在前） | editor/save.ts | 每次保存尝试后追加 |
| `reader:gh-api-base` | 自定义 API 反代地址（2026-11-07 新增，应对 api.github.com 直连不稳定）；空/缺省 = 官方地址 | editor/auth.ts | 登录对话框修改时写入；清空即恢复官方 |

## 规则

- **不含草稿**：Draft 为纯内存态（FR-009 的放弃确认以此为准），MUST NOT
  写入 localStorage（避免脏数据跨会话意外复活）；
- **token 隔离**：token 只存在于 `reader:owner-session`；edit-log 与任何
  其他输出 MUST NOT 包含 token（FR-002/012）；
- **会话复核**：页面加载时若存在 session，先执行轻量复核（`GET /user`
  login 比对），失败静默降级为访客态并清除该键（FR-010）；
- **手动清除**：删除以上键即可完全退出编辑身份（等价于界面上的"退出"）。

## 审计（宪法原则 I 对齐）

- 本契约对应的实现文件：`site-src/src/scripts/reader/editor/auth.ts`、
  `editor/save.ts`；
- 修改键名/结构 MUST 同步更新本文件与 data-model.md。
