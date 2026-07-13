const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin"
};

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function assetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { error: "SaleScout hosted demo stores reports in the browser." },
        { status: 404, headers: { "cache-control": "no-store" } }
      );
    }

    if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
      return new Response("Static asset binding is unavailable.", { status: 500 });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404 || url.pathname.includes(".")) {
      return withSecurityHeaders(assetResponse);
    }

    const fallbackResponse = await env.ASSETS.fetch(assetRequest(request, "/index.html"));
    return withSecurityHeaders(fallbackResponse);
  }
};
