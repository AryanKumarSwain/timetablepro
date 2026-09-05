import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    url: request.url,
    pathname: request.nextUrl.pathname,
    headers: Object.fromEntries(request.headers.entries()),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      APP_URL: process.env.APP_URL,
    },
  });
}
