# 变更存档：书籍自动同步失效（subtree 静默失败）

- **类型**: bug
- **日期**: 2026-11-06
- **用户原始描述**: "没有自动拉代码啊"

## 根因分析

- 002-knowledge-home 将书籍目录迁移为 `book/claude-code-book/` 后，
  `git subtree pull` 依赖的合并元数据失效：subtree 对书源执行无共同祖先的
  合并，任何有差异的文件（如 11-04 的 "update chapter1"）都会冲突
- 工作流中 `|| true` 把冲突失败**静默吞掉**，Actions 显示 success 但
  永远 `changed=false`（runs 记录：11-04 18:43 ~ 11-05 22:43 全部 success，
  书源 11-04 12:29 的更新始终未同步）
- 外部 notify（repository_dispatch）从未触发过——外部仓库工作流未按新路径
  更新，属已知问题（001 阶段遗留 TODO），小时级 cron 是唯一实际同步通道

## 修复方案

1. `.github/workflows/sync-book.yml`：同步步骤由 subtree 改为**镜像方式**
   —— `git clone --depth 1` 书源 → `rsync -a --delete`（排除 `.git/.github`）
   到 `book/claude-code-book/` → 恢复本仓库维护的 Docsify 壳
   `index.html` → 有 diff 才提交推送。不再依赖任何合并元数据，冲突不可能
   静默发生
2. 本地手动镜像补齐 11-04 起积压的书源更新
   （`fb1bf54`：01-architecture-overview.md 重写、README.md、image.png）
3. `README.md` 同步章节改写，移除已失效的 subtree 说明

## 验证

- `curl raw.githubusercontent` 对比确认书源更新已进入 `book/claude-code-book/`
- 镜像幂等：重复执行 rsync 后 `git diff --cached --quiet` 为真（无空提交）

## 备注

- 提交 `fb1bf54` 因暂存区残留混入了用户工作区的部分改动（构建产物 hash
  变更、index.astro/Header.astro 本地修改、误删 fullscreen 存档文档），
  已知悉；后续同步类提交一律使用指定路径 `git commit -- <path>`
