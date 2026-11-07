/**
 * 阅读器类型定义（specs/002-knowledge-home/data-model.md）
 */

export interface Book {
  /** 必填，唯一，[a-z0-9-]+，对应 book/<id>/ */
  id: string;
  /** 必填非空 */
  title: string;
  /** 可空，书架简介 */
  description?: string;
  /** 默认 README.md */
  defaultChapter?: string;
  /** 可选，书架排序，小的在前 */
  order?: number;
  /**
   * 可选：显式章节清单（相对书目录的 md 路径）。
   * 当 SUMMARY.md 不含链接（如 claude-code-book 的总结式 SUMMARY）时，
   * 以此作为目录来源。
   */
  chapters?: string[];
}

export interface BooksManifest {
  version: number;
  books: Book[];
}

export type ChapterState = "idle" | "loading" | "rendered" | "missing";

export interface Chapter {
  /** 相对书目录的 md 路径 */
  path: string;
  /** 目录条目文本 */
  title: string;
  /** 目录缩进层级（SUMMARY.md 嵌套层级；显式清单默认 0） */
  depth: number;
  state: ChapterState;
}

export interface ReaderState {
  currentBook: string;
  currentChapter: string;
  books: Book[];
  toc: Chapter[];
}

/* ---------------- 编辑模块（specs/003-online-book-editor/data-model.md） ---------------- */

/** 所有者会话：凭据仅存本浏览器 localStorage（FR-002），键名见 contracts/local-storage.md */
export interface OwnerSession {
  token: string;
  /** 已校验 == 配置 owner 的账号（FR-003） */
  login: string;
  /** 上次校验成功时间（ISO） */
  verifiedAt: string;
}

/**
 * 草稿/未保存修改：内存态，不落 localStorage（FR-009 放弃确认以此为准）。
 * baseSha 为进入编辑态时的远端文件 sha，新文件为 null（按新建处理）。
 */
export interface Draft {
  bookId: string;
  /** 远端相对路径（含 book/ 前缀）：章节 md 或 SUMMARY.md */
  path: string;
  original: string;
  current: string;
  baseSha: string | null;
  dirty: boolean;
}

export type ChangeKind = "update" | "create";
export type SaveResultKind = "success" | "conflict" | "failed";

/** 一次保存尝试的本地日志条目（FR-012，环形缓冲最近 50 条，不含任何凭据） */
export interface ChangeRecord {
  at: string;
  bookId: string;
  path: string;
  kind: ChangeKind;
  result: SaveResultKind;
  detail: string;
  commitUrl?: string;
}

/** 编辑目标：章节正文或书籍目录 */
export interface EditTarget {
  kind: "chapter" | "summary";
}

