/**
 * hash 路由：#/<book>/<chapter>.md
 * contracts/url-contract.md：刷新/分享可恢复；无服务端重写
 */
export interface RouteLocation {
  bookId: string;
  chapter: string;
}

const LS_KEY = "reader:last";

export function parseHash(hash: string): RouteLocation | null {
  if (!hash || !hash.startsWith("#/")) return null;
  let rest = hash.slice(2);
  try {
    rest = decodeURIComponent(rest);
  } catch {
    /* 保留原样 */
  }
  const idx = rest.indexOf("/");
  if (idx <= 0) return null;
  const bookId = rest.slice(0, idx);
  const chapter = rest.slice(idx + 1);
  if (!bookId || !chapter) return null;
  return { bookId, chapter };
}

export function buildHash(loc: RouteLocation): string {
  const chapter = loc.chapter
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `#/${encodeURIComponent(loc.bookId)}/${chapter}`;
}

export function replaceRoute(loc: RouteLocation): void {
  history.replaceState(null, "", buildHash(loc));
}

export function saveLast(loc: RouteLocation): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(loc));
  } catch {
    /* 隐私模式等场景忽略 */
  }
}

export function loadLast(): RouteLocation | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const loc = JSON.parse(raw) as RouteLocation;
    return loc && loc.bookId && loc.chapter ? loc : null;
  } catch {
    return null;
  }
}
