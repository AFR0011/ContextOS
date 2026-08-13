import "server-only";

import { NextResponse } from "next/server";

type AuthRateLimitScope = "login" | "register";

type RateLimitBucket = {
  attempts: number;
  resetAt: number;
};

type RateLimitAllowed = {
  limited: false;
};

type RateLimitBlocked = {
  limit: number;
  limited: true;
  retryAfterSeconds: number;
  windowMs: number;
};

type RateLimitResult = RateLimitAllowed | RateLimitBlocked;

const buckets = new Map<string, RateLimitBucket>();
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_LOGIN_FAILURES = 5;
const DEFAULT_REGISTER_ATTEMPTS = 3;
const PRUNE_INTERVAL_MS = 60 * 1000;
let nextPruneAt = 0;

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function configFor(scope: AuthRateLimitScope) {
  const fallback = scope === "login" ? DEFAULT_LOGIN_FAILURES : DEFAULT_REGISTER_ATTEMPTS;
  const limitName = scope === "login" ? "AUTH_LOGIN_MAX_FAILURES" : "AUTH_REGISTER_MAX_ATTEMPTS";

  return {
    limit: envNumber(limitName, fallback),
    windowMs: envNumber("AUTH_RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS)
  };
}

function clientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function normalizeIdentity(identity?: string | null) {
  const normalized = identity?.trim().toLowerCase();
  return normalized || null;
}

function keysFor(request: Request, scope: AuthRateLimitScope, identity?: string | null) {
  const ip = clientIp(request);
  const normalizedIdentity = normalizeIdentity(identity);
  const keys = [`auth:${scope}:ip:${ip}`];
  if (normalizedIdentity) keys.push(`auth:${scope}:identity:${normalizedIdentity}`);
  return keys;
}

function pruneExpiredBuckets(now: number) {
  if (now < nextPruneAt) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  nextPruneAt = now + PRUNE_INTERVAL_MS;
}

function getBucket(key: string, windowMs: number, now: number) {
  pruneExpiredBuckets(now);
  const current = buckets.get(key);
  if (current && current.resetAt > now) return current;

  const next = { attempts: 0, resetAt: now + windowMs };
  buckets.set(key, next);
  return next;
}

export function checkAuthRateLimit(request: Request, scope: AuthRateLimitScope, identity?: string | null): RateLimitResult {
  const { limit, windowMs } = configFor(scope);
  if (limit <= 0 || windowMs <= 0) return { limited: false };

  const now = Date.now();
  for (const key of keysFor(request, scope, identity)) {
    const bucket = getBucket(key, windowMs, now);
    if (bucket.attempts >= limit) {
      return {
        limit,
        limited: true,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
        windowMs
      };
    }
  }

  return { limited: false };
}

export function recordAuthRateLimitAttempt(request: Request, scope: AuthRateLimitScope, identity?: string | null) {
  const { limit, windowMs } = configFor(scope);
  if (limit <= 0 || windowMs <= 0) return;

  const now = Date.now();
  for (const key of keysFor(request, scope, identity)) {
    const bucket = getBucket(key, windowMs, now);
    bucket.attempts += 1;
  }
}

export function resetAuthRateLimit(request: Request, scope: AuthRateLimitScope, identity?: string | null) {
  for (const key of keysFor(request, scope, identity)) {
    buckets.delete(key);
  }
}

export function authRateLimitResponse(result: RateLimitBlocked) {
  return NextResponse.json(
    { error: "Too many attempts. Try again later." },
    {
      headers: {
        "Retry-After": String(result.retryAfterSeconds)
      },
      status: 429
    }
  );
}
