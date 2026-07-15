import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handoffFromFragment, validateLifeOsHandoff } from "./lifeos-handoff";

const payload = {
  schema: "lifeos-handoff",
  version: 1,
  id: "fixture-context-1",
  source: "the-ledger",
  target: "contextos",
  kind: "next-action",
  title: "Review tomorrow's attention",
  body: "A proposed next action that still needs Inbox triage.",
  area: "career-research",
  sourceRef: { entryId: "daily-1", entryType: "daily", date: "2026-07-15" },
  createdAt: "2026-07-15T12:00:00.000Z",
  sensitivity: "private"
} as const;

describe("lifeos-handoff/v1", () => {
  it("accepts and decodes a valid ContextOS proposal", () => {
    assert.equal(validateLifeOsHandoff(payload, "contextos").id, payload.id);
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    assert.equal(handoffFromFragment(`#handoff=${encoded}`, "contextos").body, payload.body);
  });

  it("rejects wrong targets, versions, kinds, and size limits", () => {
    assert.throws(() => validateLifeOsHandoff({ ...payload, target: "socialos" }, "contextos"));
    assert.throws(() => validateLifeOsHandoff({ ...payload, version: 2 }, "contextos"));
    assert.throws(() => validateLifeOsHandoff({ ...payload, kind: "task" }, "contextos"));
    assert.throws(() => validateLifeOsHandoff({ ...payload, body: "x".repeat(6_001) }, "contextos"));
  });
});
