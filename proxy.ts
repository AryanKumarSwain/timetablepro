import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type AppSessionData } from '@/lib/session';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/unauthorized'];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.')
  );
}

function needsAuthCheck(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/super-admin') ||
    (pathname.startsWith('/api') && !pathname.startsWith('/api/auth'))
  );
}

function roleHome(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    case 'TEACHER':
      return '/teacher/schedule';
    default:
      return '/login';
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || !needsAuthCheck(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<AppSessionData>(
    request,
    response,
    sessionOptions
  );

  if (!session.isLoggedIn || !session.user) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { role, onboardingDone } = session.user;

  if (
    role === 'ADMIN' &&
    onboardingDone === false &&
    pathname.startsWith('/admin')
  ) {
    return NextResponse.redirect(new URL('/signup', request.url));
  }

  if (pathname.startsWith('/super-admin') && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  if (pathname.startsWith('/teacher') && role !== 'TEACHER') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  if (pathname.startsWith('/api/admin') && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
