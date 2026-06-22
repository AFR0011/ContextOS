import 'server-only';

import { createHmac } from 'crypto';

const SSO_TTL_MS = 5 * 60 * 1000;

export function getContextOsSsoSecret(): string | null {
  const secret = process.env.CONTEXTOS_SSO_SECRET?.trim();
  return secret || null;
}

export function getSocialOsAppUrl(): string {
  const raw =
    process.env.SOCIALOS_APP_URL?.trim() || 'https://social-os-tau.vercel.app';
  return raw.replace(/\/$/, '');
}

export function isAllowedSocialOsReturnUrl(returnUrl: string): boolean {
  try {
    const allowed = getSocialOsAppUrl();
    const target = new URL(returnUrl);
    const allowedOrigin = new URL(allowed);
    return target.origin === allowedOrigin.origin;
  } catch {
    return false;
  }
}

export function signContextOsSsoToken(email: string): string | null {
  const secret = getContextOsSsoSecret();
  if (!secret) return null;

  const payload = {
    email: email.toLowerCase(),
    exp: Date.now() + SSO_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
