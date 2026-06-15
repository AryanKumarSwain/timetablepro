import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeGoogleCode } from '@/lib/google-oauth';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const callbackUrl =
    request.cookies.get('google_oauth_callback')?.value || '/signup';
  const signupUrl = new URL(callbackUrl, request.url);

  if (error) {
    signupUrl.searchParams.set('error', 'google_auth_failed');
    return NextResponse.redirect(signupUrl);
  }

  const storedState = request.cookies.get('google_oauth_state')?.value;
  if (!code || !state || !storedState || state !== storedState) {
    signupUrl.searchParams.set('error', 'invalid_oauth_state');
    return NextResponse.redirect(signupUrl);
  }

  try {
    const profile = await exchangeGoogleCode(code);

    const user = await prisma.user.findUnique({ where: { email: profile.email } });

    // Check if this is a signup flow (callbackUrl contains /signup)
    const isSignupFlow = callbackUrl.includes('/signup');

    if (!user) {
      // Only block if this is a login flow
      if (!isSignupFlow) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'AccountNotFound');
        return NextResponse.redirect(loginUrl);
      }
      
      // Allow user creation during signup
      const newUser = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          role: 'ADMIN',
          onboardingDone: false,
          phone: null,
          countryCode: null,
        },
      });
      
      const session = await getSession();
      session.user = {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        schoolId: newUser.schoolId,
        onboardingDone: newUser.onboardingDone,
        phone: newUser.phone,
        countryCode: newUser.countryCode,
      };
      session.isLoggedIn = true;
      await session.save();

      const response = NextResponse.redirect(signupUrl);
      response.cookies.delete('google_oauth_state');
      response.cookies.delete('google_oauth_callback');
      return response;
    }

    if (user.role !== 'ADMIN') {
      signupUrl.searchParams.set('error', 'account_exists');
      return NextResponse.redirect(signupUrl);
    }

    // For existing admin users, just update name if needed and log them in
    // Don't reset onboarding - let them continue with their existing account
    if (profile.name && !user.name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: profile.name },
      });
    }

    const session = await getSession();
    session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      onboardingDone: user.onboardingDone,
      phone: user.phone,
      countryCode: user.countryCode,
    };
    session.isLoggedIn = true;
    await session.save();

    const response = NextResponse.redirect(signupUrl);
    response.cookies.delete('google_oauth_state');
    response.cookies.delete('google_oauth_callback');
    return response;
  } catch (err) {
    console.error('[auth/google/callback]', err);
    signupUrl.searchParams.set('error', 'google_auth_failed');
    return NextResponse.redirect(signupUrl);
  }
}
