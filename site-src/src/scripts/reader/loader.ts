/**
 * 数据加载层：books.json 清单、SUMMARY.md 目录、章节 md
 * 契约见 specs/002-knowledge-home/contracts/books-json.md
 */
import type { Book, BooksManifest, Chapter } from "./types";
import { normalizePath } from "./markdown";

const BOOKS_JSON_URL = "/book/books.json";
const BOOKS_BASE = "/book";

/** 加载书籍清单；解析失败抛出错误（首页显示「书籍清单不可用」） */
export async function loadBooksManifest(): Promise<BooksManifest> {
  const res = await fetch(BOOKS_JSON_URL, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`books.json 加载失败：HTTP ${res.status}`);
  }
  const manifest = (await res.json()) as BooksManifest;
  if (!manifest || !Array.isArray(manifest.books)) {
    throw new Error("books.json 格式错误：缺少 books 数组");
  }
  return manifest;
}

/** 目录条目是否有效（相对 md 路径，非外链） */
function isValidChapterPath(href: string): boolean {
  if (!href) return false;
  if (/^(https?:)?\/\//i.test(href)) return false;
  if (href.startsWith("/")) return false;
  return href.toLowerCase().endsWith(".md");
}

/** 解析 SUMMARY.md 中的 markdown 链接 → Chapter[] */
function parseSummaryLinks(summary: string): Chapter[] {
  const chapters: Chapter[] = [];
  // 仅取行内链接 [text](path.md)，按行首 # 数量决定缩进
  const re = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
  for (const line of summary.split(/\r?\n/)) {
    const depth = Math.max(0, (line.match(/^#+/)?.[0].length ?? 1) - 1);
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const href = m[2].trim();
      if (!isValidChapterPath(href)) continue;
      const path = normalizePath(decodeURIComponent(href.split("#")[0]));
      if (chapters.some(c => c.path === path)) continue;
      chapters.push({ path, title: m[1].trim(), depth, state: "idle" });
    }
  }
  return chapters;
}

/**
 * 加载书籍目录。来源优先级（research.md R3）：
 * 1. SUMMARY.md 中的链接列表（gitbook 风格）
 * 2. books.json 的 chapters 显式清单
 */
export async function loadToc(book: Book): Promise<Chapter[]> {
  let summary = "";
  try {
    const res = await fetch(`${BOOKS_BASE}/${book.id}/SUMMARY.md`);
    if (res.ok) summary = await res.text();
  } catch {
    /* 网络失败按无 SUMMARY 处理 */
  }

  const chapters = parseSummaryLinks(summary);
  if (chapters.length > 0) return chapters;

  if (book.chapters && book.chapters.length > 0) {
    return book.chapters.map(path => ({
      path,
      title: path.replace(/\.md$/i, ""),
      depth: 0,
      state: "idle" as const,
    }));
  }

  throw new Error(`书籍 ${book.id} 目录不可用：SUMMARY.md 无链接且未配置 chapters`);
}

/** 拉取章节原文；404 返回 null（调用方标记 missing） */
export async function fetchChapter(
  bookId: string,
  path: string
): Promise<string | null> {
  const res = await fetch(
    `${BOOKS_BASE}/${encodeURIComponent(bookId)}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`章节加载失败：HTTP ${res.status}`);
  }
  return res.text();
}

/** 章节源文件直链（「查看源文件」） */
export function chapterSourceUrl(bookId: string, path: string): string {
  return `${BOOKS_BASE}/${encodeURIComponent(bookId)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
