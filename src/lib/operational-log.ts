import "server-only";

import { safeOperationalErrorMetadata } from "./safe-error-metadata";

const SAFE_EVENT = /^[a-z0-9_]{1,64}$/;

export function logOperationalError(event: string, error: unknown) {
  const safeEvent = SAFE_EVENT.test(event) ? event : "unexpected_error";
  console.error(`[contextos-op] ${safeEvent}`, safeOperationalErrorMetadata(error));
}
