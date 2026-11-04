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
