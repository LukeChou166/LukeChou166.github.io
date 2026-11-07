# Data Model: 003-online-book-editor

日期：2026-11-07 ｜ 关联：[spec.md](spec.md) Key Entities、[research.md](research.md)

复用实体（`site-src/src/scripts/reader/types.ts`）：

- **Book**：`{ id, title, description?, defaultChapter?, order?, chapters? }`——
  编辑器不修改其结构，仅以其 `id` 定位远端目录 `book/<id>/`；
- **Chapter**：`{ path, title, depth, state }`——编辑器关注 `path`
  （远端文件相对路径）与 `state`（章节加载态）。

## 新增实体

### OwnerSession（所有者会话）

所有者身份确认后的浏览器本地会话。

| 字段 | 类型 | 说明 |
|------|------|------|
| token | string | 细粒度 PAT，仅本仓库 Contents 读写 |
| login | string | 凭据对应账号（已校验 == 配置 owner） |
| verifiedAt | ISO 时间 | 上次校验成功时间 |

- 持久化：localStorage（键与格式见 `contracts/local-storage.md`）；
- 校验规则：建立会话时 MUST `GET /user` 且 login == owner（FR-003）；
  会话恢复（刷新页面）时执行轻量复核，失败即清除（FR-010）；
- 状态机：`none → verifying → owner` / `verifying → invalid`（invalid 归于 none，
  附原因：凭据失效 / 非所有者）。

### Draft（草稿/未保存修改）

某个文件的进行中编辑，生命周期 = 当前页面会话（内存态，不落 localStorage）。

| 字段 | 类型 | 说明 |
|------|------|------|
| bookId | string | 所属书 |
| path | string | 远端相对路径（章节 md 或 `SUMMARY.md`） |
| original | string | 进入编辑态时的远端原文 |
| current | string | 当前编辑内容（textarea 绑定） |
| baseSha | string \| null | 进入编辑态时远端文件 sha（新文件为 null） |
| dirty | boolean | current !== original |

- 校验规则：保存 MUST 携带 baseSha 做冲突校验（FR-006）；dirty 时切换
  章节/书籍/关闭页面 MUST 触发放弃确认（FR-009）；
- 状态机：`idle → editing → saving → saved`（回 idle，内容区回到阅读态）；
  `saving → conflict | failed`（停留 editing，草稿保留）。

### ChangeRecord（保存记录）

一次保存尝试的本地日志条目（FR-012，环形缓冲最近 50 条）。

| 字段 | 类型 | 说明 |
|------|------|------|
| at | ISO 时间 | 尝试时间 |
| bookId / path | string | 目标文件 |
| kind | `update` \| `create` | 是否新建文件 |
| result | `success` \| `conflict` \| `failed` | 结果 |
| detail | string | 失败原因摘要（不含任何凭据内容） |
| commitUrl? | string | 成功时的提交页链接 |

### EditTarget（编辑目标，派生概念）

`kind = chapter | summary`：章节 md 或书籍目录 `SUMMARY.md`；决定警示条
（`claude-code-book` 固定警示，FR-011）与保存后的 UI 行为（保存 SUMMARY
成功后需重拉该书目录 `loadToc`）。

## 实体关系

- OwnerSession 1 ─ * Draft（会话内可先后编辑多个文件，但同一时刻至多
  一个活跃 Draft）；
- Draft 1 ─ 1 EditTarget（决定保存路径与 UI 分支）；
- Draft 保存成功 ─ 产生 1 ChangeRecord；
- Draft.current 经 `renderMarkdown(md, bookId)` → 编辑预览 HTML
  （FR-005，与阅读态同一管线）。

## 远端数据（既有，只读约定不变）

- `book/<id>/*.md` 与 `book/<id>/SUMMARY.md`：保存的唯一落点；
- `book/books.json`：v1 **不在**编辑范围（新增整本书仍按 README 流程走，
  spec A5）；后续演进可经 Git Data API 批量提交（research.md R2）。
