import { NextRequest, NextResponse } from 'next/server';

// Public routes that don't need auth
const PUBLIC_ROUTES = [
  '/login',
  '/operator-login',
  '/403',
  '/',
];

// Static files and API routes to skip
const SKIP_PATTERNS = [
  '/api',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/icons',
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip static files and API routes
  if (SKIP_PATTERNS.some(pattern => pathname.startsWith(pattern))) {
    return NextResponse.next();
  }

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const token = request.cookies.get('thunder_token');

  // If no token, redirect to appropriate login
  if (!token) {
    if (pathname.startsWith('/operator')) {
      return NextResponse.redirect(new URL('/operator-login', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Token exists, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
