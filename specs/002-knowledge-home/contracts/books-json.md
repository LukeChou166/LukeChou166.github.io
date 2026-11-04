# Contract: book/books.json（书籍清单）

Feature: 002-knowledge-home | Date: 2026-11-04

## 作用

阅读器首页唯一的书籍元数据来源。新增/下架书籍只改本文件 + 对应目录。

## Schema

```jsonc
{
  "version": 1,
  "books": [
    {
      "id": "claude-code-book",        // 必填，唯一，[a-z0-9-]+，对应 book/<id>/
      "title": "Claude Code 深度源码解析", // 必填
      "description": "基于反编译源码的深度解析专栏", // 可选
      "defaultChapter": "README.md",   // 可选，默认 README.md
      "order": 1                        // 可选，书架排序，小的在前
    }
  ]
}
```

## 校验规则

- `id` 必须与 `book/<id>/` 目录名一致，且目录内存在 `SUMMARY.md`；
  不满足 → 阅读器跳过该书并在控制台警告（不渲染死卡片）
- JSON 解析失败 → 首页显示明确错误提示（"书籍清单不可用"），不白屏
- `version` 当前恒为 1；未来 schema 变更用新 version + 兼容读取

## 示例（当前状态）

```json
{
  "version": 1,
  "books": [
    {
      "id": "claude-code-book",
      "title": "Claude Code 深度源码解析",
      "description": "基于 Claude Code 反编译还原源码的深度解析专栏",
      "defaultChapter": "README.md",
      "order": 1
    }
  ]
}
```

## 维护

- 本文件由本仓库人工维护；subtree 同步目标为 `book/claude-code-book/`，
  MUST NOT 覆盖本文件（subtree prefix 已隔离）
