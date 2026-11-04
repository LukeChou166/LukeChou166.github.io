/**
 * 阅读器入口：串联 loader/route/markdown（specs/002-knowledge-home/tasks.md T010/T015/T016）
 * 挂载点见 site-src/src/pages/index.astro：
 *   #bookshelf / #reader-menu-btn / #reader-toc(#toc-list) / #reader-content
 */
import type { Book, Chapter } from "./types";
import { loadBooksManifest, loadToc, fetchChapter, chapterSourceUrl } from "./loader";
import { renderMarkdown } from "./markdown";
import {
  parseHash,
  buildHash,
  replaceRoute,
  saveLast,
  loadLast,
  type RouteLocation,
} from "./route";

const state = {
  books: [] as Book[],
  currentBook: null as Book | null,
  toc: [] as Chapter[],
  currentChapter: null as string | null,
};

const $shelf = () => document.getElementById("bookshelf");
const $tocList = () => document.getElementById("toc-list");
const $content = () => document.getElementById("reader-content");
const $tocAside = () => document.getElementById("reader-toc");

/* ---------------- 书架（US2, T014/T015/T016） ---------------- */

function renderBookShelf(): void {
  const shelf = $shelf();
  if (!shelf) return;
  if (state.books.length === 0) {
    shelf.innerHTML = `<p class="reader-empty">书籍清单不可用</p>`;
    return;
  }
  shelf.innerHTML = state.books
    .map(
      b => `
      <button class="reader-book${b.id === state.currentBook?.id ? " active" : ""}"
              data-book-id="${b.id}" type="button"
              title="${b.description ?? b.title}">
        <span class="reader-book-title">${b.title}</span>
        ${b.description ? `<span class="reader-book-desc">${b.description}</span>` : ""}
      </button>`
    )
    .join("");
}

function bindShelf(): void {
  $shelf()?.addEventListener("click", e => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-book-id]");
    if (!btn) return;
    const book = state.books.find(b => b.id === btn.dataset.bookId);
    if (book && book.id !== state.currentBook?.id) switchBook(book);
  });
}

/** 校验书籍：SUMMARY.md 不可达则剔除（T016 降级） */
async function validateBook(book: Book): Promise<boolean> {
  try {
    const res = await fetch(`/book/${encodeURIComponent(book.id)}/SUMMARY.md`, {
      method: "HEAD",
    });
    const ok = res.ok || res.status === 405; // 静态服务可能不支持 HEAD
    if (!ok && res.status !== 200) {
      console.warn(`[reader] 书籍 ${book.id} 校验失败：HTTP ${res.status}，已跳过`);
      return false;
    }
    return true;
  } catch {
    console.warn(`[reader] 书籍 ${book.id} 校验网络失败，已跳过`);
    return false;
  }
}

/* ---------------- 目录（US1, T010） ---------------- */

function renderToc(): void {
  const list = $tocList();
  if (!list || !state.currentBook) return;
  const book = state.currentBook;
  list.innerHTML = state.toc
    .map(
      c => `
      <a class="reader-toc-item depth-${Math.min(c.depth, 3)}${
        c.path === state.currentChapter ? " active" : ""
      }" data-chapter="${c.path}"
         href="${buildHash({ bookId: book.id, chapter: c.path })}"
         title="${c.title}">${c.title}</a>`
    )
    .join("");
}

function highlightActiveToc(): void {
  $tocList()
    ?.querySelectorAll("[data-chapter]")
    .forEach(el => {
      el.classList.toggle("active", el.getAttribute("data-chapter") === state.currentChapter);
    });
}

/* ---------------- 章节内容（US1, T010/T011） ---------------- */

function showLoading(title: string): void {
  const content = $content();
  if (content) content.innerHTML = `<p class="reader-status">加载中：${title} …</p>`;
}

function showMissing(path: string): void {
  const content = $content();
  if (content)
    content.innerHTML = `
      <div class="reader-status reader-error">
        <p>章节缺失：<code>${path}</code></p>
        <p class="reader-status-sub">该文件不存在或尚未同步，请稍后再试。</p>
      </div>`;
}

function showError(message: string): void {
  const content = $content();
  if (content)
    content.innerHTML = `
      <div class="reader-status reader-error">
        <p>${message}</p>
        <p class="reader-status-sub">请刷新重试，或检查书籍配置。</p>
      </div>`;
}

async function openChapter(path: string): Promise<void> {
  const book = state.currentBook;
  const content = $content();
  if (!book || !content) return;

  const chapter = state.toc.find(c => c.path === path);
  if (chapter) chapter.state = "loading";
  state.currentChapter = path;
  highlightActiveToc();
  saveLast({ bookId: book.id, chapter: path });
  replaceRoute({ bookId: book.id, chapter: path });

  try {
    const raw = await fetchChapter(book.id, path);
    if (raw === null) {
      if (chapter) chapter.state = "missing";
      showMissing(path);
      return;
    }
    const html = renderMarkdown(raw, book.id);
    const title = chapter?.title ?? path;
    content.innerHTML = `
      <header class="reader-content-header">
        <h1 class="reader-content-title">${title}</h1>
        <a class="reader-source-link"
           href="${chapterSourceUrl(book.id, path)}"
           target="_blank" rel="noopener">查看源文件 ↗</a>
      </header>
      <div class="reader-markdown">${html}</div>`;
    if (chapter) chapter.state = "rendered";
    content.scrollTop = 0;
    // 目录抽屉自动收起（移动端, T012）
    $tocAside()?.classList.remove("open");
  } catch (err) {
    if (chapter) chapter.state = "missing";
    showError(`章节加载失败：${err instanceof Error ? err.message : String(err)}`);
  }
}

/* ---------------- 书籍切换（US2, T015） ---------------- */

async function switchBook(book: Book, chapter?: string): Promise<void> {
  state.currentBook = book;
  state.currentChapter = null;
  renderBookShelf();

  const list = $tocList();
  if (list) list.innerHTML = `<p class="reader-status">目录加载中 …</p>`;

  try {
    state.toc = await loadToc(book);
  } catch (err) {
    state.toc = [];
    if (list)
      list.innerHTML = `<p class="reader-status reader-error">${
        err instanceof Error ? err.message : "目录加载失败"
      }</p>`;
    return;
  }

  renderToc();
  const target = chapter ?? book.defaultChapter ?? state.toc[0]?.path;
  if (target) await openChapter(target);
}

/* ---------------- 路由（US1, T009） ---------------- */

async function navigateFromHash(): Promise<void> {
  const loc = parseHash(window.location.hash);
  if (!loc) return;
  if (loc.bookId !== state.currentBook?.id) {
    const book = state.books.find(b => b.id === loc.bookId);
    if (book) {
      await switchBook(book, loc.chapter);
      return;
    }
  }
  if (loc.chapter !== state.currentChapter) {
    await openChapter(loc.chapter);
  }
}

async function init(): Promise<void> {
  const root = $tocAside();
  // 幂等保护：视图过渡（astro:page-load）可能多次触发，避免重复绑定
  if (!root || root.dataset.readerInit === "1") return;
  root.dataset.readerInit = "1";

  bindShelf();

  // 移动端目录抽屉（T012）
  document.getElementById("reader-menu-btn")?.addEventListener("click", () => {
    $tocAside()?.classList.toggle("open");
  });

  let manifest;
  try {
    manifest = await loadBooksManifest();
  } catch (err) {
    renderBookShelf();
    showError(
      `书籍清单不可用：${err instanceof Error ? err.message : String(err)}`
    );
    return;
  }

  // 无效书剔除（T016）
  const checked = await Promise.all(
    [...manifest.books]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(async b => ((await validateBook(b)) ? b : null))
  );
  state.books = checked.filter((b): b is Book => b !== null);

  // 初始定位（T009）：hash > localStorage > 清单第一本
  const fromHash = parseHash(window.location.hash);
  const fromLast = loadLast();
  const initial: RouteLocation | null =
    fromHash ??
    (fromLast && state.books.some(b => b.id === fromLast.bookId)
      ? fromLast
      : null);
  const firstBook = state.books[0];

  if (!firstBook) {
    renderBookShelf();
    showError("没有可用的书籍，请检查 book/books.json 配置。");
    return;
  }

  const initialBook =
    state.books.find(b => b.id === initial?.bookId) ?? firstBook;
  const initialChapter =
    initial && initial.bookId === initialBook.id
      ? initial.chapter
      : (initialBook.defaultChapter ?? state.toc[0]?.path);

  await switchBook(initialBook, initialChapter);
  // 无 hash 时把推导出的位置写回地址栏
  if (!fromHash && state.currentBook && state.currentChapter) {
    replaceRoute({ bookId: state.currentBook.id, chapter: state.currentChapter });
  }

  window.addEventListener("hashchange", navigateFromHash);
}

/**
 * 阅读器内的 #/ 链接（目录 + 正文站内章节链接）在捕获阶段自行导航：
 * Layout 的 ClientRouter 会拦截链接点击改用 pushState（不触发 hashchange），
 * 必须在其之前 preventDefault 并改用 location.hash 赋值以走原生事件。
 */
function bindHashLinkInterceptor(): void {
  document.addEventListener(
    "click",
    e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const anchor = (e.target as HTMLElement).closest?.("a[href^='#/']");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      if (window.location.hash === href) return;
      window.location.hash = href; // 原生赋值 → 触发 hashchange → navigateFromHash
    },
    true
  );
}

bindHashLinkInterceptor();
// ClientRouter 下 astro:page-load 在首次加载与每次视图过渡后都会触发；
// 无 ClientRouter 的普通加载也会触发（Astro 兼容行为），幂等保护兜底。
document.addEventListener("astro:page-load", () => init());
init();
