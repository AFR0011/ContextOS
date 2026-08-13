const SHELL_VERSION = "v3";
const CACHE_NAME = `contextos-shell-${SHELL_VERSION}`;
const CACHE_PREFIX = "contextos-shell-";
const SHELL_ENTRY = "/dashboard";
const SHELL_MANIFEST_KEY = "/__contextos_shell_manifest__";
const CORE_WORKSPACE_ROUTES = new Set([
  "/dashboard",
  "/inbox",
  "/today",
  "/this-week",
  "/projects",
  "/dates",
  "/deadlines",
  "/areas",
  "/resources",
  "/archive",
  "/search",
  "/reviews",
  "/settings"
]);

function normalizedResourceUrl(value, base = self.location.origin) {
  try {
    const url = new URL(value, base);
    if (url.origin !== self.location.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function isShellAsset(pathname) {
  return pathname.startsWith("/_next/static/") || pathname === "/manifest.webmanifest" || pathname.startsWith("/icons/");
}

function discoverHtmlAssets(html) {
  const resources = new Set();
  const attributePattern = /(?:src|href)=["']([^"']+)["']/gi;
  let match;
  while ((match = attributePattern.exec(html))) {
    const resource = normalizedResourceUrl(match[1]);
    if (!resource) continue;
    const pathname = new URL(resource, self.location.origin).pathname;
    if (isShellAsset(pathname)) resources.add(resource);
  }
  return resources;
}

function discoverCssAssets(css, cssUrl) {
  const resources = new Set();
  const urlPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let match;
  while ((match = urlPattern.exec(css))) {
    const value = match[1]?.trim();
    if (!value || value.startsWith("data:")) continue;
    const resource = normalizedResourceUrl(value, new URL(cssUrl, self.location.origin));
    if (!resource) continue;
    const pathname = new URL(resource, self.location.origin).pathname;
    if (isShellAsset(pathname)) resources.add(resource);
  }
  return resources;
}

async function fetchShellResource(cache, resource) {
  const response = await fetch(new Request(resource, { cache: "reload", credentials: "same-origin" }));
  if (!response.ok) throw new Error(`Shell resource ${resource} returned ${response.status}`);
  await cache.put(resource, response.clone());
  return response;
}

async function primeShell() {
  const cache = await caches.open(CACHE_NAME);
  const shellResponse = await fetch(
    new Request(SHELL_ENTRY, {
      cache: "reload",
      credentials: "same-origin",
      headers: { Accept: "text/html" }
    })
  );
  if (!shellResponse.ok) throw new Error(`Shell entry returned ${shellResponse.status}`);

  const html = await shellResponse.clone().text();
  await cache.put(SHELL_ENTRY, shellResponse);

  const queued = [...discoverHtmlAssets(html), "/manifest.webmanifest"];
  const resources = new Set([SHELL_ENTRY]);

  while (queued.length) {
    const resource = queued.shift();
    if (!resource || resources.has(resource)) continue;
    resources.add(resource);

    const response = await fetchShellResource(cache, resource);
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/css")) {
      const css = await response.clone().text();
      for (const dependency of discoverCssAssets(css, resource)) {
        if (!resources.has(dependency)) queued.push(dependency);
      }
    }
  }

  const manifest = {
    version: SHELL_VERSION,
    generatedAt: new Date().toISOString(),
    resources: [...resources].sort()
  };
  await cache.put(
    SHELL_MANIFEST_KEY,
    new Response(JSON.stringify(manifest), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    })
  );
  return manifest;
}

async function readShellManifest() {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(SHELL_MANIFEST_KEY);
  if (!response) return null;
  try {
    const manifest = await response.json();
    if (manifest?.version !== SHELL_VERSION || !Array.isArray(manifest.resources)) return null;
    return manifest;
  } catch {
    return null;
  }
}

async function shellStatus() {
  const manifest = await readShellManifest();
  if (!manifest) return { ready: false, version: SHELL_VERSION, missing: [SHELL_MANIFEST_KEY] };

  const cache = await caches.open(CACHE_NAME);
  const missing = [];
  for (const resource of manifest.resources) {
    if (!(await cache.match(resource))) missing.push(resource);
  }
  return { ready: missing.length === 0, version: SHELL_VERSION, missing };
}

async function removeOldShellCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
}

async function cachedShellResponse(request) {
  const current = await caches.open(CACHE_NAME);
  const exact = await current.match(request);
  if (exact) return exact;
  const entry = await current.match(SHELL_ENTRY);
  if (entry) return entry;

  const keys = await caches.keys();
  for (const key of keys.filter((value) => value.startsWith(CACHE_PREFIX) && value !== CACHE_NAME).reverse()) {
    const cache = await caches.open(key);
    const fallback = (await cache.match(request)) || (await cache.match(SHELL_ENTRY));
    if (fallback) return fallback;
  }
  return null;
}

async function cachedAssetResponse(request) {
  const current = await caches.open(CACHE_NAME);
  const exact = await current.match(request);
  if (exact) return exact;

  const keys = await caches.keys();
  for (const key of keys.filter((value) => value.startsWith(CACHE_PREFIX) && value !== CACHE_NAME).reverse()) {
    const cache = await caches.open(key);
    const fallback = await cache.match(request);
    if (fallback) return fallback;
  }
  return null;
}

function isCoreWorkspacePath(pathname) {
  return CORE_WORKSPACE_ROUTES.has(pathname) || pathname.startsWith("/projects/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    primeShell()
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const status = await shellStatus();
      if (status.ready) await removeOldShellCaches();
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  const type = event.data?.type;
  if (type !== "CONTEXTOS_SHELL_STATUS" && type !== "CONTEXTOS_SHELL_PRIME") return;

  event.waitUntil(
    (async () => {
      if (type === "CONTEXTOS_SHELL_PRIME") {
        try {
          await primeShell();
        } catch {
          // The status response below exposes incomplete resources without claiming
          // offline readiness merely because a registration exists.
        }
      }
      const status = await shellStatus();
      if (status.ready) await removeOldShellCaches();
      event.ports?.[0]?.postMessage(status);
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API traffic is deliberately network-only. The service worker must never turn
  // an API outage into an HTML shell response or a stale cached server result.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        if (!isCoreWorkspacePath(url.pathname)) throw new Error("Offline navigation is outside the cached workspace shell.");
        const cached = await cachedShellResponse(request);
        if (cached) return cached;
        return new Response("ContextOS offline shell is not ready.", {
          status: 503,
          headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" }
        });
      })
    );
    return;
  }

  if (isShellAsset(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await cachedAssetResponse(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      })()
    );
  }
});
