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
  /**
   * 实际仓库名，与 git remote 一致（2026-11-07 修正：`luluyouyue.github.io`
   * 为改名前旧名，API 对旧名返回 301；GET 可跟随重定向，但 PUT 遇 301
   * 会被浏览器降级为 GET 导致保存失败，MUST 直连现名）。
   */
  repo: "LukeChou166.github.io",
  branch: "master",
} as const;

const SESSION_KEY = "reader:owner-session";
const API_BASE_KEY = "reader:gh-api-base";
const DEFAULT_API_BASE = "https://api.github.com";

/**
 * 可选自定义 API 地址（contracts/local-storage.md：reader:gh-api-base）。
 * api.github.com 在部分网络环境（如中国大陆）直连不稳定，所有者可在登录
 * 对话框填入自建反代地址（如 Cloudflare Worker）；留空 = 官方地址。
 */
export function getAPIBase(): string {
  try {
    const v = (localStorage.getItem(API_BASE_KEY) ?? "")
      .trim()
      .replace(/\/+$/, "");
    return v || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
}

export function saveAPIBase(base: string): void {
  try {
    const v = base.trim().replace(/\/+$/, "");
    if (v) localStorage.setItem(API_BASE_KEY, v);
    else localStorage.removeItem(API_BASE_KEY);
  } catch {
    /* 忽略 */
  }
}

export function apiUrl(path: string): string {
  return `${getAPIBase()}${path}`;
}

/**
 * 网络请求重试：仅对 fetch 抛异常（连接失败/被重置）重试，HTTP 状态错误
 * 不重试。PUT 幂等（固定 sha），重复成功只是同一提交。应对间歇性网络阻断。
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 2
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/** 平台接口通用请求头（contracts/github-contents-api.md） */
export function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export type VerifyResult =
  | { ok: true; login: string }
  | { ok: false; reason: string };

/** 身份校验：GET /user → login 与配置 owner 比对（FR-003） */
export async function verifyToken(token: string): Promise<VerifyResult> {
  let res: Response;
  try {
    res = await fetchWithRetry(apiUrl("/user"), {
      headers: authHeaders(token),
    });
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
