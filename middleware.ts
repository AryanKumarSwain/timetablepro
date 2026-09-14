import { NextResponse, type NextRequest } from 'next/server';
import { apiLimiter, getClientIp } from '@/lib/rate-limit';

// Suspicious file patterns and probe extensions commonly targeted by bot scanners
const SUSPICIOUS_PATTERNS = [
  /\/\.env/i,
  /\/\.git/i,
  /\/\.aws/i,
  /\/\.vscode/i,
  /\/\.well-known\/(?!acme-challenge)/i,
  /\.php$/i,
  /\.asp$/i,
  /\.aspx$/i,
  /\.jsp$/i,
  /\.cgi$/i,
  /\.sh$/i,
  /\.sql$/i,
  /\.bak$/i,
  /\.config$/i,
  /wp-admin/i,
  /wp-login/i,
  /phpmyadmin/i,
  /actuator/i,
  /\.\./, // Directory traversal
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Defend against path traversal, scanner probes, and sensitive file requests
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(pathname)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // 2. Global Rate Limiting for API routes
  if (pathname.startsWith('/api/')) {
    const clientIp = getClientIp(request);
    const rateLimit = apiLimiter.check(`global:${clientIp}`);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down and try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      );
    }
  }

  // 3. Attach Defense-in-Depth Security Headers to all responses
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  );

  // Enforce HSTS in production environments
  if (process.env.NODE_ENV === 'production' || request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, fonts, and assets in /public
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|otf)$).*)',
  ],
};
