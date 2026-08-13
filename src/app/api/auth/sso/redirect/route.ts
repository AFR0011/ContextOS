import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getSocialOsAppUrl,
  isAllowedSocialOsReturnUrl,
  signContextOsSsoToken,
} from '@/lib/sso-bridge';

export const dynamic = 'force-dynamic';

/** Issue a short-lived SSO token and redirect back to SocialOS. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnUrl = url.searchParams.get('returnUrl');

  if (!returnUrl || !isAllowedSocialOsReturnUrl(returnUrl)) {
    return NextResponse.json({ error: 'Invalid return URL.' }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    const login = new URL('/login', request.url);
    login.searchParams.set(
      'next',
      `/api/auth/sso/redirect?returnUrl=${encodeURIComponent(returnUrl)}`
    );
    return NextResponse.redirect(login);
  }

  const sso = signContextOsSsoToken(user.email);
  if (!sso) {
    return NextResponse.json(
      {
        error:
          'CONTEXTOS_SSO_SECRET is missing or too short. Configure the same secret with at least 32 characters on SocialOS and ContextOS.',
      },
      { status: 503 }
    );
  }

  const target = new URL(returnUrl);
  target.searchParams.set('sso', sso);
  return NextResponse.redirect(target.toString());
}
