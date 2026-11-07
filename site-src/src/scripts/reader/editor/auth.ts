/**
 * 编辑模块：所有者会话（specs/003-online-book-editor）
 * 决策来源：research.md R1（PAT 直连校验）/ R6（站点配置）；
 * 存储契约：contracts/local-storage.md（键 reader:owner-session）
 */
import type { OwnerSession } from "../types";

/**
 * 站点与仓库配置（research.md R6）。
 * 注意：owner 与 site-src/astro-paper.config.ts 的 site.profile 对应账号联动，
 * 变更时 MUST 同步两处。
 */
export const EDITOR_CONFIG = {
  owner: "LukeChou166",
  repo: "luluyouyue.github.io",
  branch: "master",
} as const;

const SESSION_KEY = "reader:owner-session";
const API_ROOT = "https://api.github.com";

/** 平台接口通用请求头（contracts/github-contents-api.md） */
export function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function apiUrl(path: string): string {
  return `${API_ROOT}${path}`;
}

export type VerifyResult =
  | { ok: true; login: string }
  | { ok: false; reason: string };

/** 身份校验：GET /user → login 与配置 owner 比对（FR-003） */
export async function verifyToken(token: string): Promise<VerifyResult> {
  let res: Response;
  try {
    res = await fetch(`${API_ROOT}/user`, { headers: authHeaders(token) });
  } catch {
    return { ok: false, reason: "网络异常，身份校验失败，请重试" };
  }
  if (res.status === 401) {
    return { ok: false, reason: "凭据无效或已过期" };
  }
  if (!res.ok) {
    return { ok: false, reason: `身份校验失败：HTTP ${res.status}` };
  }
  let login: unknown;
  try {
    login = (await res.json()).login;
  } catch {
    return { ok: false, reason: "身份校验响应解析失败" };
  }
  if (typeof login !== "string" || login.length === 0) {
    return { ok: false, reason: "身份校验响应缺少账号信息" };
  }
  if (login !== EDITOR_CONFIG.owner) {
    return {
      ok: false,
      reason: `该账号（${login}）不是站点仓库所有者`,
    };
  }
  return { ok: true, login };
}

function writeSession(session: OwnerSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* 隐私模式等场景忽略（与 route.ts 一致） */
  }
}

/** 读取本地会话（不做网络校验）；owner 态判断统一走此函数 */
export function getSession(): OwnerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OwnerSession>;
    if (
      parsed &&
      typeof parsed.token === "string" &&
      parsed.token.length > 0 &&
      typeof parsed.login === "string" &&
      parsed.login === EDITOR_CONFIG.owner
    ) {
      return parsed as OwnerSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, login: string): void {
  writeSession({ token, login, verifiedAt: new Date().toISOString() });
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* 忽略 */
  }
}

/**
 * 会话恢复：页面加载时轻量复核（FR-010）。
 * 复核失败（凭据失效/账号不符/伪造数据）静默清除，降级为访客态。
 */
export async function restoreSession(): Promise<OwnerSession | null> {
  const session = getSession();
  if (!session) return null;
  const result = await verifyToken(session.token);
  if (result.ok) return session;
  clearSession();
  return null;
}
