from pathlib import Path

path = Path("tests/e2e/contextos.spec.ts")
text = path.read_text()
old = '''  const swResponse = await page.request.get("/sw.js");
  const serviceWorker = await swResponse.text();
  expect(serviceWorker).toContain('const CACHE_NAME = "contextos-shell-v2"');
  expect(serviceWorker).toContain('"/dates"');
  expect(serviceWorker).not.toContain('"/deadlines"');
'''
new = '''  const swResponse = await page.request.get("/sw.js");
  const serviceWorker = await swResponse.text();
  expect(serviceWorker).toContain('const SHELL_VERSION = "v3"');
  expect(serviceWorker).toContain('const SHELL_MANIFEST_KEY = "/__contextos_shell_manifest__"');
  expect(serviceWorker).toContain('"/dates"');
  expect(serviceWorker).toContain('"/deadlines"');
  expect(serviceWorker).toContain('url.pathname.startsWith("/api/")');
  expect(serviceWorker).toContain('CONTEXTOS_SHELL_STATUS');
  expect(serviceWorker).toContain('CONTEXTOS_SHELL_PRIME');
'''
if old not in text:
    raise SystemExit("service-worker assertion block not found")
path.write_text(text.replace(old, new, 1))
