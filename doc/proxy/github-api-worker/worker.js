/**
 * GitHub API 反代（Cloudflare Worker）
 *
 * 用途：编辑器所在网络直连 api.github.com 不稳定时，用自己部署的 Worker
 * 做透明转发，解决「网络请求失败」。
 *
 * 部署：见同目录 README.md。部署后把 Worker 地址填入编辑器登录对话框的
 * 「API 地址」输入框（token 只会发给你自己的 Worker → GitHub，不经任何第三方）。
 *
 * 安全说明：本 Worker 不做任何日志/缓存，仅转发请求；只读 + 编辑器需要的
 * GET/PUT，其余方法拒绝。建议部署后在 Cloudflare 后台给 Worker 绑定
 * Access 或限制来源（可选加固）。
 */

const ALLOWED_METHODS = new Set(["GET", "HEAD", "PUT"]);
const ALLOWED_API_HOST = "api.github.com";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Authorization, Accept, Content-Type, X-GitHub-Api-Version",
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request) {
    // CORS 预检：浏览器因自定义请求头（Authorization 等）会先发 OPTIONS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // 仅允许 GET/HEAD/PUT（编辑器所需），其余方法直接拒绝
    if (!ALLOWED_METHODS.has(request.method)) {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders(),
      });
    }

    // 透明转发到 GitHub API（保留 path/query，如 ?ref=master）
    const upstreamURL = `https://${ALLOWED_API_HOST}${url.pathname}${url.search}`;

    // 透传请求头（含 Authorization），去掉会导致问题的 Host/CF 头
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ipcountry");
    headers.delete("cf-ray");
    headers.delete("cf-visitor");
    headers.delete("x-forwarded-proto");
    headers.delete("x-real-ip");

    const upstream = await fetch(upstreamURL, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : request.body,
      redirect: "follow",
    });

    // 透传响应，覆盖 CORS 头（GitHub 返回的是 * ，这里显式重申）
    const responseHeaders = new Headers(upstream.headers);
    for (const [key, value] of Object.entries(corsHeaders())) {
      responseHeaders.set(key, value);
    }
    // 禁缓存，避免读到过期 sha 导致冲突误判
    responseHeaders.set("Cache-Control", "no-store");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  },
};
