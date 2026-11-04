/**
 * Markdown 渲染（research.md R2：marked，随 Astro bundle，无 CDN）
 * 相对路径解析基准 /book/<id>/（contracts/url-contract.md C-3）：
 * - 同书 .md 相对链接 → 阅读器内 hash 路由 #/<book>/<path>
 * - 图片/其他资源 → /book/<id>/...
 * - 外链/锚点保持原样
 */
import { marked, type Token, type Tokens } from "marked";

/** 归一化相对路径：解析 ./ 与 ../ 片段 */
export function normalizePath(rel: string): string {
  const stack: string[] = [];
  for (const p of rel.split("/")) {
    if (!p || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return stack.join("/");
}

function joinBase(bookId: string, rel: string): string {
  return `/book/${encodeURIComponent(bookId)}/${normalizePath(rel)
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function renderMarkdown(md: string, bookId: string): string {
  const renderer = new marked.Renderer();

  const rewrite = (href: string): string => {
    if (!href) return href;
    if (/^(https?:)?\/\//i.test(href)) return href; // 外链
    if (href.startsWith("#")) return href; // 页内锚点
    if (href.startsWith("/")) return href; // 站内绝对路径
    const path = decodeURIComponent(href.split("#")[0]);
    if (path.toLowerCase().endsWith(".md")) {
      const normalized = normalizePath(path);
      return `#/${encodeURIComponent(bookId)}/${normalized}`;
    }
    return joinBase(bookId, href);
  };

  renderer.link = function (
    this: { parser: { parseInline: (tokens: Token[]) => string } },
    token: Tokens.Link
  ) {
    const { href, title, tokens } = token;
    const text = this.parser.parseInline(tokens);
    return `<a href="${rewrite(href)}"${
      title ? ` title="${title}"` : ""
    } rel="noopener">${text}</a>`;
  };
  renderer.image = function (token) {
    const { href, title, text } = token as {
      href: string;
      title?: string | null;
      text: string;
    };
    return `<img src="${rewrite(href)}"${
      title ? ` title="${title}"` : ""
    } alt="${text ?? ""}" loading="lazy">`;
  };

  return marked.parse(md, { renderer, async: false, gfm: true }) as string;
}
