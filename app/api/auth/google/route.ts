import { NextRequest, NextResponse } from 'next/server';
import {
  buildGoogleAuthUrl,
  createOAuthState,
  getGoogleOAuthConfig,
} from '@/lib/google-oauth';

export async function GET(request: NextRequest) {
  const config = getGoogleOAuthConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' },
      { status: 503 }
    );
  }

  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/signup';
  const state = createOAuthState();

  const response = NextResponse.redirect(buildGoogleAuthUrl(state));
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  });
  response.cookies.set('google_oauth_callback', callbackUrl, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  });

  return response;
}
