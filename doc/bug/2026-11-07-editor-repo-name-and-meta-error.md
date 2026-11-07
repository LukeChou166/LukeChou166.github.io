# Bug 存档：编辑器「无法获取远端文件信息」— 仓库名配置错误 + 元数据错误被静默吞掉

日期：2026-11-07 ｜ 类型：**bug**

## 用户原始 query

> 真实页面编辑时提示「无法获取远端文件信息，请稍后重试。」

## 根因分析

两个叠加问题：

1. **`EDITOR_CONFIG.repo` 配置了改名前的旧仓库名**
   - 真实仓库（`git remote -v`）：`LukeChou166/LukeChou166.github.io`；
   - 配置写的是 `luluyouyue.github.io`（research.md R6 从站点目录名推断，未核对 remote）；
   - 平台对旧名返回 **301**：GET 可被浏览器 fetch 自动跟随重定向（表面可用），
     但 **PUT 遇 301 会按规范降级为 GET** → 即使权限配对，保存也必然失败。
2. **`fetchRemoteMeta` 静默吞错**：所有非 404 失败（401/403/网络）统一返回
   `null`，UI 只显示固定文案，用户无法看到真实状态码——本例实际失败点很可能是
   **细粒度 PAT 未勾选本仓库或缺少 `Contents: Read`**（`/user` 不需要仓库权限，
   所以登录能成功、读文件 403）。

## 涉及文件与行号

- `site-src/src/scripts/reader/editor/auth.ts:14` — `EDITOR_CONFIG.repo` 旧名（根因 1）
- `site-src/src/scripts/reader/editor/save.ts` — `fetchRemoteMeta` 返回 `null` 吞错（根因 2）
- `site-src/src/scripts/reader/editor/editor.ts` — `startEditing` / `pullLatest` 两处调用点
- `specs/003-online-book-editor/contracts/github-contents-api.md` — 固定参数表仓库名

## 修复方案

1. `EDITOR_CONFIG.repo` → `LukeChou166.github.io`，注释说明 301/PUT 降级风险；
2. `fetchRemoteMeta` 改为返回 `FetchMetaResult`（`{ok:true, meta}` /
   `{ok:false, message}`），403/401 附带可读提示（权限配置检查/重新登录引导）；
3. `editor.ts` 两处调用点适配，编辑态失败页展示具体原因 + 排查建议；
4. 契约文件同步修正仓库名与「接口 2」错误语义。

## 验证命令与结果

```bash
git remote -v                                    # → LukeChou166/LukeChou166.github.io.git
curl -s -o /dev/null -w "%{http_code}" \
  https://api.github.com/repos/LukeChou166/luluyouyue.github.io/contents/book/agent-papers/OpenHands_zh.md?ref=master
# → 301（旧名，跟随重定向后 GET 200，但 PUT 会降级失败）
curl -s -o /dev/null -w "%{http_code}" \
  https://api.github.com/repos/LukeChou166/LukeChou166.github.io/contents/book/agent-papers/OpenHands_zh.md?ref=master
# → 200（现名直连正常）
cd site-src && npm run build                     # → astro check + build 零错误
```

## 用户侧后续动作

1. 检查细粒度 PAT：Repository access 勾选 `LukeChou166/LukeChou166.github.io`，
   Permissions → Contents: **Read and write**（Metadata 只读为默认必选）；
2. 推送本次修复构建产物后，重新打开章节点「编辑」；若仍失败，界面会显示
   具体状态码与原因。
