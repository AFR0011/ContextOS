export type HandoffTarget = "contextos" | "socialos";
export type HandoffKind = "next-action" | "project-update" | "note" | "social-reflection" | "follow-up";

export interface LifeOsHandoffV1 {
  schema: "lifeos-handoff";
  version: 1;
  id: string;
  source: "the-ledger" | "lifeos" | "contextos" | "socialos";
  target: HandoffTarget;
  kind: HandoffKind;
  title: string;
  body: string;
  area?: string;
  sourceRef: {
    entryId?: string;
    entryType?: string;
    date?: string;
    lifeosPath?: string;
  };
  createdAt: string;
  sensitivity: "private";
}

const KINDS: HandoffKind[] = ["next-action", "project-update", "note", "social-reflection", "follow-up"];
const SOURCES = ["the-ledger", "lifeos", "contextos", "socialos"];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateLifeOsHandoff(value: unknown, expectedTarget: HandoffTarget): LifeOsHandoffV1 {
  if (!record(value) || value.schema !== "lifeos-handoff" || value.version !== 1) {
    throw new Error("Unsupported handoff schema or version.");
  }
  if (value.target !== expectedTarget) throw new Error(`This handoff is not intended for ${expectedTarget}.`);
  if (!KINDS.includes(value.kind as HandoffKind)) throw new Error("Invalid handoff kind.");
  if (!SOURCES.includes(String(value.source))) throw new Error("Invalid handoff source.");
  if (typeof value.id !== "string" || !value.id.trim()) throw new Error("Missing handoff ID.");
  if (typeof value.title !== "string" || !value.title.trim() || value.title.length > 160) {
    throw new Error("The handoff title must be 1-160 characters.");
  }
  if (typeof value.body !== "string" || !value.body.trim() || new TextEncoder().encode(value.body).length > 6_000) {
    throw new Error("The handoff body must be 1-6,000 UTF-8 bytes.");
  }
  if (!record(value.sourceRef) || typeof value.createdAt !== "string" || value.sensitivity !== "private") {
    throw new Error("Incomplete handoff metadata.");
  }
  return value as unknown as LifeOsHandoffV1;
}

export function handoffFromFragment(fragment: string, expectedTarget: HandoffTarget): LifeOsHandoffV1 {
  const encoded = new URLSearchParams(fragment.replace(/^#/, "")).get("handoff");
  if (!encoded) throw new Error("No handoff payload was provided.");
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return validateLifeOsHandoff(JSON.parse(new TextDecoder().decode(bytes)), expectedTarget);
  } catch (error) {
    if (error instanceof Error && !error.message.includes("Invalid character") && !error.message.includes("JSON")) throw error;
    throw new Error("The handoff payload is malformed.");
  }
}
