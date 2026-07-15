export const DATABASE_UNAVAILABLE_CODE = "database_unavailable";
export const DATABASE_UNAVAILABLE_MESSAGE =
  "ContextOS cannot reach its database right now. Please try again shortly.";

const PRISMA_CONNECTION_CODES = new Set(["P1000", "P1001", "P1002", "P1008", "P1010", "P1011", "P1017", "P2024"]);
const NODE_CONNECTION_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH"]);
const CONNECTION_MESSAGE_PATTERNS = [
  "can't reach database server",
  "cannot reach database server",
  "connection refused",
  "connection terminated",
  "connect econnrefused",
  "connect etimedout",
  "database connection",
  "failed to connect",
  "fetching a new connection",
  "control plane request failed",
  "server closed the connection",
  "terminating connection"
];

function valueToString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function inspectError(error: unknown, seen = new Set<unknown>()): { code: string; message: string } {
  if (!error || typeof error !== "object" || seen.has(error)) {
    return { code: "", message: valueToString(error) };
  }

  seen.add(error);
  const record = error as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    cause?: unknown;
    stack?: unknown;
  };
  const nested = inspectError(record.cause, seen);

  return {
    code: [record.code, nested.code].map(valueToString).find(Boolean) ?? "",
    message: [record.name, record.message, record.stack, nested.message].map(valueToString).filter(Boolean).join(" ")
  };
}

export function isDatabaseUnavailableError(error: unknown) {
  const { code, message } = inspectError(error);
  if (PRISMA_CONNECTION_CODES.has(code) || NODE_CONNECTION_CODES.has(code)) return true;

  const normalized = message.toLowerCase();
  return CONNECTION_MESSAGE_PATTERNS.some((pattern) => normalized.includes(pattern));
}
