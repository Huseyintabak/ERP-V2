import { NextRequest, NextResponse } from 'next/server';

// Operator route patterns (redirect to /operator-login)
const OPERATOR_PATTERNS = [
  '/operator-dashboard',
];

// Dashboard route patterns (redirect to /login)
const DASHBOARD_PATTERNS = [
  '/dashboard',
  '/yonetici-dashboard',
  '/planlama-dashboard',
  '/depo-dashboard',
  '/uretim',
  '/stok',
  '/musteriler',
  '/raporlar',
  '/ayarlar',
  '/kullanicilar',
  '/satinalma',
  '/sirket-yonetimi',
  '/bildirimler',
  '/islem-gecmisi',
  '/ai-',
  '/depo-zone-yonetimi',
  '/sistem-bakim',
];

// Public routes that don't need auth
const PUBLIC_PATTERNS = [
  '/login',
  '/operator-login',
  '/403',
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip public routes
  if (PUBLIC_PATTERNS.some(pattern => pathname.includes(pattern)) || pathname === '/') {
    return NextResponse.next();
  }
  
  // Check for auth cookie
  const token = request.cookies.get('thunder_token');
  
  // Check if it's an operator route
  const isOperatorRoute = OPERATOR_PATTERNS.some(pattern => pathname.includes(pattern));
  
  if (isOperatorRoute) {
    if (!token) {
      const loginUrl = new URL('/operator-login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }
  
  // Check if it's a dashboard route
  const isDashboardRoute = DASHBOARD_PATTERNS.some(pattern => pathname.includes(pattern));
  
  if (isDashboardRoute) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
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