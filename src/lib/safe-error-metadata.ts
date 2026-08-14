const SAFE_CLASS_NAME = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;
const SAFE_PRISMA_CODE = /^P\d{4}$/;
const SAFE_SQLSTATE_CODE = /^[0-9A-Z]{5}$/;
const SAFE_NETWORK_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN"
]);

export type SafeOperationalErrorMetadata = {
  kind: "error" | "non-error";
  className?: string;
  code?: string;
};

function safeErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  if (typeof code !== "string") return undefined;

  if (SAFE_PRISMA_CODE.test(code) || SAFE_SQLSTATE_CODE.test(code) || SAFE_NETWORK_CODES.has(code)) {
    return code;
  }

  return undefined;
}

export function safeOperationalErrorMetadata(error: unknown): SafeOperationalErrorMetadata {
  const metadata: SafeOperationalErrorMetadata = {
    kind: error instanceof Error ? "error" : "non-error"
  };

  if (error instanceof Error) {
    const className = error.constructor?.name;
    if (typeof className === "string" && SAFE_CLASS_NAME.test(className)) {
      metadata.className = className;
    }
  }

  const code = safeErrorCode(error);
  if (code) metadata.code = code;

  return metadata;
}
