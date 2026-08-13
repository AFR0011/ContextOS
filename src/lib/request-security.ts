import "server-only";

import { NextResponse } from "next/server";

function normalizedOrigin(value: string | undefined | null) {
  if (!value) return null;
  const candidate = value.includes("://") ? value : `https://${value}`;
  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function allowedMutationOrigins(request: Request) {
  const origins = new Set<string>();
  origins.add(new URL(request.url).origin);

  for (const configured of [process.env.NEXT_PUBLIC_APP_URL, process.env.APP_URL, process.env.VERCEL_URL]) {
    const origin = normalizedOrigin(configured);
    if (origin) origins.add(origin);
  }

  return origins;
}

/**
 * Browser state-changing requests must come from the exact application origin.
 *
 * Requests from controlled non-browser clients may omit Origin/Sec-Fetch-Site;
 * those remain usable for CLI/API verification. Browser fetch metadata is not
 * caller-controlled JavaScript, so a cross-site browser request without an
 * Origin header is still rejected when Sec-Fetch-Site exposes it.
 */
export function rejectCrossOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();

  if (origin) {
    if (origin === "null" || !allowedMutationOrigins(request).has(origin)) {
      return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
    }
    return null;
  }

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  return null;
}
