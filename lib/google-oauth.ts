import { randomBytes } from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/api/auth/google/callback`,
  };
}

export function buildGoogleAuthUrl(state: string) {
  const config = getGoogleOAuthConfig();
  if (!config) {
    throw new Error('Google OAuth is not configured');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function createOAuthState() {
  return randomBytes(32).toString('hex');
}

export async function exchangeGoogleCode(code: string) {
  const config = getGoogleOAuthConfig();
  if (!config) {
    throw new Error('Google OAuth is not configured');
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(tokenData.error_description || 'Failed to exchange Google auth code');
  }

  const profileRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const profile = await profileRes.json();
  if (!profileRes.ok || !profile.email) {
    throw new Error('Failed to fetch Google profile');
  }

  return {
    email: String(profile.email).trim().toLowerCase(),
    name: profile.name ? String(profile.name).trim() : null,
    picture: profile.picture ? String(profile.picture) : null,
  };
}
