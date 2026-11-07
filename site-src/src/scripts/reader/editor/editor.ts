/**
 * 编辑器 UI（specs/003-online-book-editor/contracts/ui-editor-contract.md）
 * - 访客态零编辑元素（DOM 级不存在，非 CSS 隐藏，FR-001）
 * - 编辑态为内存态，不新增 hash 路由（编辑入口"不可猜"）
 * - 预览复用阅读态渲染管线 renderMarkdown（FR-005）
 */
import type { Draft, EditTarget } from "../types";
import { renderMarkdown } from "../markdown";
import {
  clearSession,
  getSession,
  restoreSession,
  saveSession,
  verifyToken,
} from "./auth";
import { fetchRemoteMeta, saveFile } from "./save";

interface EditorHooks {
  getCurrentBookId(): string | null;
  getCurrentChapterPath(): string | null;
  getCurrentChapterRaw(): string | null;
  /** 保存/取消后回到阅读态（重新渲染当前章节，可附带提示） */
  reopenChapter(notice?: { kind: "success" | "info"; html: string }): void;
  /** SUMMARY 保存成功后重载该书目录 */
  reloadToc(): Promise<void>;
  /** 会话状态变化后刷新编辑入口（TOC 动作 + 内容头动作） */
  refreshChrome(): void;
}

let hooks: EditorHooks | null = null;
let editing: { target: EditTarget; draft: Draft } | null = null;
let previewTimer: number | undefined;

const $content = () => document.getElementById("reader-content");

export function isOwner(): boolean {
  return getSession() !== null;
}

export function hasDirtyDraft(): boolean {
  return editing?.draft.dirty ?? false;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------------- 初始化（US2, T007） ---------------- */

export async function initEditor(h: EditorHooks): Promise<void> {
  hooks = h;
  bindGuards();
  await restoreSession(); // 复核（FR-010）：失败静默降级访客态
  renderLoginEntry();
}

/** 页脚不显眼的固定入口（访客态可见；owner 态隐藏） */
function renderLoginEntry(): void {
  let entry = document.getElementById("reader-owner-entry");
  if (!entry) {
    entry = document.createElement("div");
    entry.id = "reader-owner-entry";
    entry.className = "reader-owner-login";
    entry.innerHTML = `
      <a href="#" id="reader-owner-login-link" title="站点所有者身份确认">所有者登录</a>
      <div class="reader-owner-dialog" id="reader-owner-dialog" hidden>
        <label for="reader-owner-token">GitHub 细粒度 PAT（仅本仓库 Contents 读写）</label>
        <input type="password" id="reader-owner-token" autocomplete="off">
        <p class="reader-owner-msg" id="reader-owner-msg" aria-live="polite"></p>
        <button type="button" id="reader-owner-verify" class="reader-btn reader-btn-primary">确认身份</button>
      </div>`;
    document.body.appendChild(entry);
    entry
      .querySelector("#reader-owner-login-link")
      ?.addEventListener("click", e => {
        e.preventDefault();
        toggleLoginDialog();
      });
    entry
      .querySelector("#reader-owner-verify")
      ?.addEventListener("click", () => void doVerify());
  }
  updateLoginVisibility();
}

function toggleLoginDialog(): void {
  const dialog = document.getElementById("reader-owner-dialog");
  if (!dialog) return;
  dialog.hidden = !dialog.hidden;
  if (!dialog.hidden) {
    (document.getElementById("reader-owner-token") as HTMLInputElement | null)?.focus();
  }
}

function openLoginDialog(message: string): void {
  const dialog = document.getElementById("reader-owner-dialog");
  const msg = document.getElementById("reader-owner-msg");
  if (dialog) dialog.hidden = false;
  if (msg) msg.textContent = message;
}

function updateLoginVisibility(): void {
  document
    .getElementById("reader-owner-entry")
    ?.classList.toggle("owner", isOwner());
}

async function doVerify(): Promise<void> {
  const input = document.getElementById(
    "reader-owner-token"
  ) as HTMLInputElement | null;
  const msg = document.getElementById("reader-owner-msg");
  const btn = document.getElementById(
    "reader-owner-verify"
  ) as HTMLButtonElement | null;
  if (!input || !msg || !btn) return;
  const token = input.value.trim();
  if (!token) {
    msg.textContent = "请输入访问凭据";
    return;
  }
  msg.textContent = "校验中…";
  btn.disabled = true;
  const result = await verifyToken(token);
  btn.disabled = false;
  if (!result.ok) {
    msg.textContent = result.reason;
    return;
  }
  saveSession(token, result.login);
  input.value = "";
  msg.textContent = "";
  const dialog = document.getElementById("reader-owner-dialog");
  if (dialog) dialog.hidden = true;
  updateLoginVisibility();
  hooks?.refreshChrome();
}

async function signOutOwner(): Promise<void> {
  if (hasDirtyDraft() && !window.confirm("有未保存的修改，确认放弃并退出登录？")) {
    return;
  }
  editing = null;
  clearSession();
  updateLoginVisibility();
  hooks?.refreshChrome();
  hooks?.reopenChapter();
}

/* ---------------- 阅读态注入（US1/US2, T005/T008/T016） ---------------- */

/**
 * 章节内容头注入 owner 动作（编辑 / 退出登录）。
 * 无有效会话或编辑态时 MUST NOT 注入任何元素（FR-001）。
 */
export function notifyChapterRendered(headerEl: HTMLElement | null): void {
  if (!headerEl) return;
  headerEl.querySelector(".reader-editor-actions")?.remove();
  if (!isOwner() || editing) return;
  const actions = document.createElement("span");
  actions.className = "reader-editor-actions";
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "reader-btn reader-btn-primary";
  editBtn.textContent = "编辑";
  editBtn.title = "在浏览器中编辑本章节";
  editBtn.addEventListener("click", () => void startEditing({ kind: "chapter" }));
  const signOut = document.createElement("a");
  signOut.href = "#";
  signOut.className = "reader-source-link";
  signOut.textContent = "退出登录";
  signOut.title = "清除本浏览器所有者会话";
  signOut.addEventListener("click", e => {
    e.preventDefault();
    void signOutOwner();
  });
  actions.append(editBtn, signOut);
  headerEl.appendChild(actions);
}

/** 目录区注入「编辑目录」动作（owner 态，US4/T016） */
export function notifyTocRendered(tocEl: HTMLElement): void {
  tocEl.querySelector(".reader-edit-toc")?.remove();
  if (!isOwner() || editing) return;
  if (!hooks?.getCurrentBookId()) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "reader-toc-item reader-edit-toc";
  btn.textContent = "✎ 编辑目录";
  btn.title = "编辑本书 SUMMARY 目录";
  btn.addEventListener("click", () => void startEditing({ kind: "summary" }));
  tocEl.appendChild(btn);
}

/* ---------------- 编辑态（US2, T009/T010） ---------------- */

function editTargetPath(bookId: string, target: EditTarget): string | null {
  if (target.kind === "summary") return `book/${bookId}/SUMMARY.md`;
  const chapterPath = hooks?.getCurrentChapterPath();
  return chapterPath ? `book/${bookId}/${chapterPath}` : null;
}

export async function startEditing(target: EditTarget): Promise<void> {
  const session = getSession();
  const bookId = hooks?.getCurrentBookId();
  const content = $content();
  if (!hooks || !bookId || !session || !content) return;
  const path = editTargetPath(bookId, target);
  if (!path) return;

  content.innerHTML = `<p class="reader-status">加载编辑器：<code>${escapeHtml(path)}</code> …</p>`;
  const meta = await fetchRemoteMeta(path, session.token);
  if (meta === null) {
    content.innerHTML = `<p class="reader-status reader-error">无法获取远端文件信息，请稍后重试。</p>`;
    return;
  }
  // 章节编辑优先用当前已加载原文（避免额外网络往返与内容漂移）
  const original =
    target.kind === "chapter" ? (hooks.getCurrentChapterRaw() ?? meta.content) : meta.content;
  editing = {
    target,
    draft: { bookId, path, original, current: original, baseSha: meta.sha, dirty: false },
  };
  renderPanel();
}

function updateBadge(): void {
  const badge = document.getElementById("reader-dirty-badge");
  if (badge) badge.hidden = !hasDirtyDraft();
}

function setFeedback(html: string): void {
  const box = document.getElementById("reader-editor-feedback");
  if (box) box.innerHTML = html;
}

function renderPanel(): void {
  const content = $content();
  if (!content || !editing) return;
  const { draft } = editing;
  const title =
    editing.target.kind === "summary"
      ? `编辑目录（${escapeHtml(draft.bookId)}/SUMMARY.md）`
      : `编辑：${escapeHtml(draft.path.replace(/^book\/[^/]+\//, ""))}`;
  // FR-011：自动同步书籍固定警示（不可关闭）
  const banner =
    draft.bookId === "claude-code-book"
      ? `<div class="reader-editor-banner">⚠️ 该书由 GitHub Actions 每小时从书源仓库镜像同步（<code>.github/workflows/sync-book.yml</code>），此处手动修改会被下一次同步覆盖。</div>`
      : "";
  content.innerHTML = `
    ${banner}
    <header class="reader-content-header">
      <h1 class="reader-content-title">${title}<span class="reader-dirty-badge" id="reader-dirty-badge" hidden>未保存</span></h1>
      <span class="reader-editor-actions">
        <button type="button" class="reader-btn reader-btn-primary" id="reader-editor-save">保存</button>
        <button type="button" class="reader-btn" id="reader-editor-cancel">取消</button>
      </span>
    </header>
    <div class="reader-editor-feedback" id="reader-editor-feedback"></div>
    <div class="reader-editor-grid">
      <textarea id="reader-editor-text" class="reader-editor-text" spellcheck="false" aria-label="Markdown 原文编辑区"></textarea>
      <div id="reader-editor-preview" class="reader-markdown reader-editor-preview"></div>
    </div>`;

  const text = content.querySelector<HTMLTextAreaElement>("#reader-editor-text");
  const preview = content.querySelector("#reader-editor-preview");
  if (!text || !preview) return;
  text.value = draft.current;
  preview.innerHTML = renderMarkdown(draft.current, draft.bookId);

  text.addEventListener("input", () => {
    if (!editing) return;
    editing.draft.current = text.value;
    editing.draft.dirty = editing.draft.current !== editing.draft.original;
    updateBadge();
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => {
      if (editing) preview.innerHTML = renderMarkdown(editing.draft.current, editing.draft.bookId);
    }, 300);
  });
  content
    .querySelector("#reader-editor-save")
    ?.addEventListener("click", () => void onSave());
  content.querySelector("#reader-editor-cancel")?.addEventListener("click", onCancel);
  content.scrollTop = 0;
}

/* ---------------- 保存（US3, T013/T014） ---------------- */

async function onSave(): Promise<void> {
  const content = $content();
  if (!content || !editing) return;
  let session = getSession();
  if (!session) {
    setFeedback(
      `<p class="reader-editor-feedback-msg reader-editor-feedback-error">未确认所有者身份，无法保存。</p><p class="reader-editor-feedback-sub">草稿已保留，请重新确认身份后继续。</p>`
    );
    openLoginDialog("凭据已失效，请重新输入");
    return;
  }
  const saveBtn = content.querySelector<HTMLButtonElement>("#reader-editor-save");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "保存中…";
  }
  setFeedback("");
  const outcome = await saveFile(editing.draft, session.token);

  if (outcome.result === "success") {
    editing.draft.baseSha = outcome.sha;
    editing.draft.dirty = false;
    editing = null;
    updateLoginVisibility();
    hooks?.reopenChapter({
      kind: "success",
      html: `已保存并提交 <a href="${escapeHtml(outcome.commitUrl)}" target="_blank" rel="noopener">查看提交 ↗</a>，站点自动部署后生效。`,
    });
    return;
  }

  if (outcome.result === "conflict") {
    // FR-006：MUST NOT 静默覆盖；草稿保留，提供拉取/载入远端两条路径
    setFeedback(`
      <p class="reader-editor-feedback-msg reader-editor-feedback-error">保存未提交：${escapeHtml(outcome.message)}，为避免覆盖他人修改。</p>
      <p class="reader-editor-feedback-actions">
        <button type="button" class="reader-btn" id="reader-editor-pull">更新基准（手动合并后重试）</button>
        <button type="button" class="reader-btn" id="reader-editor-loadremote">载入远端版本（丢弃本地修改）</button>
      </p>`);
    content
      .querySelector("#reader-editor-pull")
      ?.addEventListener("click", () => void pullLatest(false));
    content
      .querySelector("#reader-editor-loadremote")
      ?.addEventListener("click", () => void pullLatest(true));
  } else if (outcome.status === 401) {
    // 凭据失效：清除会话 + 引导重新确认；草稿保留（FR-007）
    clearSession();
    updateLoginVisibility();
    hooks?.refreshChrome();
    setFeedback(
      `<p class="reader-editor-feedback-msg reader-editor-feedback-error">保存失败：${escapeHtml(outcome.message)}</p><p class="reader-editor-feedback-sub">草稿已保留，重新确认身份后可继续保存。</p>`
    );
    openLoginDialog("凭据已失效，请重新输入");
  } else {
    setFeedback(`
      <p class="reader-editor-feedback-msg reader-editor-feedback-error">保存失败：${escapeHtml(outcome.message)}</p>
      <p class="reader-editor-feedback-actions"><button type="button" class="reader-btn" id="reader-editor-retry">重试</button></p>`);
    content
      .querySelector("#reader-editor-retry")
      ?.addEventListener("click", () => void onSave());
  }
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.textContent = "保存";
  }
}

/**
 * 冲突后的基准更新：
 * - discardLocal=false：仅更新 baseSha/original，保留本地编辑内容供手动合并
 * - discardLocal=true：本地修改替换为远端版本
 * 两者均 MUST NOT 自动带旧内容重试保存（contracts/github-contents-api.md）
 */
async function pullLatest(discardLocal: boolean): Promise<void> {
  const session = getSession();
  if (!session || !editing) return;
  const meta = await fetchRemoteMeta(editing.draft.path, session.token);
  if (meta === null || !meta.exists || meta.sha === null) {
    setFeedback(`<p class="reader-editor-feedback-msg reader-editor-feedback-error">拉取最新失败，请重试。</p>`);
    return;
  }
  editing.draft.baseSha = meta.sha;
  editing.draft.original = meta.content;
  if (discardLocal) {
    editing.draft.current = meta.content;
    const text = document.getElementById(
      "reader-editor-text"
    ) as HTMLTextAreaElement | null;
    const preview = document.getElementById("reader-editor-preview");
    if (text) text.value = meta.content;
    if (preview) preview.innerHTML = renderMarkdown(meta.content, editing.draft.bookId);
  }
  editing.draft.dirty = editing.draft.current !== editing.draft.original;
  updateBadge();
  setFeedback(
    `<p class="reader-editor-feedback-msg">已更新基准版本（基于最新远端 sha）。${
      discardLocal ? "已载入远端版本。" : "请在编辑区手动合并后重试保存。"
    }</p>`
  );
}

function onCancel(): void {
  if (!editing) return;
  if (editing.draft.dirty && !window.confirm("有未保存的修改，确认放弃并离开？")) {
    return;
  }
  editing = null;
  hooks?.reopenChapter();
}

/* ---------------- 全局守卫（US4, T017 / FR-009） ---------------- */

/** 未保存时切换章节/书籍/关闭页面的放弃确认；返回 true 表示允许离开 */
export function confirmLeave(): boolean {
  if (!hasDirtyDraft()) return true;
  return window.confirm("有未保存的修改，确认放弃并离开？");
}

function bindGuards(): void {
  window.addEventListener("beforeunload", e => {
    if (!hasDirtyDraft()) return;
    e.preventDefault();
    e.returnValue = "";
  });
}
