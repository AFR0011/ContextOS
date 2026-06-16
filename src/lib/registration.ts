import "server-only";

export function isPublicRegistrationEnabled() {
  if (process.env.ALLOW_PUBLIC_REGISTRATION === "true") return true;
  if (process.env.ALLOW_PUBLIC_REGISTRATION === "false") return false;
  return process.env.NODE_ENV !== "production";
}
