/**
 * 保存通道：GitHub Contents API（specs/003-online-book-editor/contracts/github-contents-api.md）
 * - 读元数据：GET contents（取 sha，404 → 新建）
 * - 写回：PUT contents（Base64 全文 + branch + sha 冲突校验，FR-006）
 * - 每次尝试写 localStorage["reader:edit-log"] 环形日志（FR-012，不含凭据）
 */
import type { ChangeKind, ChangeRecord, Draft } from "../types";
import { EDITOR_CONFIG, apiUrl, authHeaders } from "./auth";

const LOG_KEY = "reader:edit-log";
const LOG_LIMIT = 50;

export interface RemoteMeta {
  /** 远端文件 sha；文件不存在时为 null */
  sha: string | null;
  content: string;
  exists: boolean;
}

export type SaveOutcome =
  | { result: "success"; commitUrl: string; sha: string; kind: ChangeKind }
  | { result: "conflict"; message: string; kind: ChangeKind }
  | { result: "failed"; message: string; kind: ChangeKind; status?: number };

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/** 可写前缀校验（contracts/github-contents-api.md 固定参数） */
function isWritablePath(path: string): boolean {
  return path.startsWith("book/");
}

function decodeBase64Utf8(b64: string): string {
  const clean = b64.replace(/\s/g, "");
  const bytes = Uint8Array.from(atob(clean), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * 读取远端文件元数据（进入编辑态时调用）。
 * 200 → sha + 内容；404 → 新建（sha=null，content=""）；
 * 其他失败 → null（调用方提示重试，不进入编辑态）。
 */
export async function fetchRemoteMeta(
  path: string,
  token: string
): Promise<RemoteMeta | null> {
  if (!isWritablePath(path)) return null;
  const url = apiUrl(
    `/repos/${EDITOR_CONFIG.repo}/contents/${encodePath(path)}?ref=${EDITOR_CONFIG.branch}`
  );
  let res: Response;
  try {
    res = await fetch(url, { headers: authHeaders(token) });
  } catch {
    return null;
  }
  if (res.status === 404) {
    return { sha: null, content: "", exists: false };
  }
  if (!res.ok) return null;
  try {
    const data = (await res.json()) as {
      sha?: unknown;
      content?: unknown;
    };
    if (typeof data.sha !== "string" || typeof data.content !== "string") {
      return null;
    }
    return {
      sha: data.sha,
      content: decodeBase64Utf8(data.content),
      exists: true,
    };
  } catch {
    return null;
  }
}

function appendLog(record: ChangeRecord): void {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const list = raw ? (JSON.parse(raw) as ChangeRecord[]) : [];
    const next = [record, ...list].slice(0, LOG_LIMIT);
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    /* 日志失败不影响保存流程 */
  }
}

function logAttempt(
  draft: Draft,
  kind: ChangeKind,
  result: ChangeRecord["result"],
  detail: string,
  commitUrl?: string
): void {
  appendLog({
    at: new Date().toISOString(),
    bookId: draft.bookId,
    path: draft.path,
    kind,
    result,
    detail: detail.slice(0, 200),
    ...(commitUrl ? { commitUrl } : {}),
  });
}

/**
 * 保存：基于 baseSha 冲突校验的提交写回（FR-006/007）。
 * 响应 → 分支映射见 contracts/github-contents-api.md：
 * 200/201 成功；409 冲突（MUST NOT 静默覆盖）；401 凭据失效；403/422/网络 失败。
 */
export async function saveFile(
  draft: Draft,
  token: string
): Promise<SaveOutcome> {
  if (!isWritablePath(draft.path)) {
    return { result: "failed", message: "路径必须位于 book/ 目录下", kind: "update" };
  }
  const kind: ChangeKind = draft.baseSha === null ? "create" : "update";
  const message = `edit(book): ${kind} ${draft.path.replace(
    /^book\//,
    ""
  )} via web editor`;
  const body: Record<string, unknown> = {
    message,
    content: toBase64Utf8(draft.current),
    branch: EDITOR_CONFIG.branch,
  };
  if (draft.baseSha !== null) body.sha = draft.baseSha;

  let res: Response;
  try {
    res = await fetch(
      apiUrl(
        `/repos/${EDITOR_CONFIG.repo}/contents/${encodePath(draft.path)}`
      ),
      { method: "PUT", headers: authHeaders(token), body: JSON.stringify(body) }
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logAttempt(draft, kind, "failed", `网络请求失败：${detail}`);
    return { result: "failed", message: `网络请求失败：${detail}`, kind };
  }

  if (res.ok) {
    let sha = "";
    let commitUrl = "";
    try {
      const data = (await res.json()) as {
        content?: { sha?: unknown };
        commit?: { html_url?: unknown; sha?: unknown };
      };
      if (typeof data.content?.sha === "string") sha = data.content.sha;
      else if (typeof data.commit?.sha === "string") sha = data.commit.sha;
      if (typeof data.commit?.html_url === "string") {
        commitUrl = data.commit.html_url;
      }
    } catch {
      /* 保存已成功，响应解析失败仅影响展示 */
    }
    logAttempt(draft, kind, "success", "保存成功", commitUrl || undefined);
    return { result: "success", commitUrl, sha, kind };
  }

  if (res.status === 409) {
    logAttempt(draft, kind, "conflict", "HTTP 409：远端内容已被更新");
    return {
      result: "conflict",
      message: "远端内容已被更新（并发修改）",
      kind,
    };
  }

  let reason = `HTTP ${res.status}`;
  try {
    const data = (await res.json()) as { message?: unknown };
    if (typeof data.message === "string" && data.message) {
      reason = `${reason}：${data.message}`;
    }
  } catch {
    /* 保留状态码原因 */
  }
  logAttempt(draft, kind, "failed", reason, undefined);
  return {
    result: "failed",
    message: reason,
    kind,
    status: res.status,
  };
}
