import test from "node:test";
import assert from "node:assert/strict";
import { createLifeOsModuleProvider, normalizeLifeOsModuleHref } from "./lifeos-modules";

test("normalizes only safe LifeOS module destinations", () => {
  assert.equal(normalizeLifeOsModuleHref("/ravel"), "/ravel");
  assert.equal(normalizeLifeOsModuleHref("/lifeos/ravel?view=today"), "/lifeos/ravel?view=today");
  assert.equal(normalizeLifeOsModuleHref("https://ravel.example.com/app"), "https://ravel.example.com/app");
  assert.equal(normalizeLifeOsModuleHref("http://localhost:4100"), "http://localhost:4100/");

  assert.equal(normalizeLifeOsModuleHref(""), null);
  assert.equal(normalizeLifeOsModuleHref("   "), null);
  assert.equal(normalizeLifeOsModuleHref("//evil.example.com"), null);
  assert.equal(normalizeLifeOsModuleHref("javascript:alert(1)"), null);
  assert.equal(normalizeLifeOsModuleHref("ftp://example.com"), null);
  assert.equal(normalizeLifeOsModuleHref("https://user:pass@example.com"), null);
  assert.equal(normalizeLifeOsModuleHref("/\\evil.example.com"), null);
});

test("LifeOS module provider leaves unconfigured modules disconnected", () => {
  const modules = createLifeOsModuleProvider({
    ravel: "https://ravel.example.com",
    socialos: null,
    ledger: "/ledger",
    canon: "javascript:alert(1)"
  }).getModules();

  assert.deepEqual(modules.map(({ id, href, summary }) => ({ id, href, summary })), [
    { id: "ravel", href: "https://ravel.example.com/", summary: null },
    { id: "socialos", href: null, summary: null },
    { id: "ledger", href: "/ledger", summary: null },
    { id: "canon", href: null, summary: null }
  ]);
});
