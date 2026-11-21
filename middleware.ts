import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE = 'thunder_token';

// Sayfalar: login olmadan erişilebilenler
const PUBLIC_PAGES = ['/login', '/operator-login', '/403', '/'];

// API: JWT olmadan erişilebilenler (route kendi korumasını yapar ya da veri hassas değil)
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/operators/public', // operator-login ekranındaki operatör listesi
  '/api/exchange/usd', // public TCMB kuru; cron da cookie'siz çağırıyor
  '/api/cron/', // CRON_SECRET ile korunur
  '/api/settings/broadcast', // x-service-token veya JWT ile korunur (route içinde)
];

// Client'ın sahteleyebileceği kimlik header'ları — her istekte silinip JWT'den yeniden yazılır
const IDENTITY_HEADERS = ['x-user-id', 'x-user-role', 'x-user-email'];

const AI_ENABLED = process.env.AI_ENABLED === 'true';
const AI_PAGE_PREFIXES = [
  '/ai-agent-builder',
  '/ai-dashboard',
  '/ai-gelistirme',
  '/ai-geliştirme',
  '/ai-konusmalar',
  '/ai-logs',
  '/ai-maliyetler',
  '/ai-manager',
  '/ai-onaylar',
];

interface TokenPayload {
  userId: string;
  role: string;
  email: string;
}

async function verifyToken(token: string | undefined): Promise<TokenPayload | null> {
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });
    const userId = (payload.userId || payload.user_id || payload.id || payload.sub) as string | undefined;
    const role = (payload.role || payload.user_role) as string | undefined;
    if (!userId || !role) return null;
    return { userId, role, email: String(payload.email || '') };
  } catch {
    return null;
  }
}

function getToken(request: NextRequest): string | undefined {
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie) return cookie;
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return undefined;
}

function stripIdentityHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  IDENTITY_HEADERS.forEach((h) => headers.delete(h));
  return headers;
}

async function handleApi(request: NextRequest, pathname: string) {
  if (!AI_ENABLED && pathname.startsWith('/api/ai/')) {
    return NextResponse.json({ error: 'AI module is disabled' }, { status: 404 });
  }

  const headers = stripIdentityHeaders(request);

  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request: { headers } });
  }

  const user = await verifyToken(getToken(request));
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  headers.set('x-user-id', user.userId);
  headers.set('x-user-role', user.role);
  headers.set('x-user-email', user.email);
  return NextResponse.next({ request: { headers } });
}

async function handlePage(request: NextRequest, pathname: string) {
  if (PUBLIC_PAGES.includes(pathname)) {
    return NextResponse.next();
  }

  const user = await verifyToken(request.cookies.get(AUTH_COOKIE)?.value);
  if (!user) {
    const loginPath = pathname.startsWith('/operator') ? '/operator-login' : '/login';
    const response = NextResponse.redirect(new URL(loginPath, request.url));
    response.cookies.delete(AUTH_COOKIE);
    return response;
  }

  if (!AI_ENABLED && AI_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/api/')) {
    return handleApi(request, pathname);
  }
  return handlePage(request, pathname);
}

export const config = {
  matcher: [
    // API: İSTİSNASIZ her path (örn. /api/bom/x.json gibi uzantılı dinamik segmentler dahil)
    '/api/:path*',
    /*
     * Sayfalar: statik dosyalar hariç — _next/static, _next/image, icons/ ve public/ altındaki
     * uzantılı dosyalar (favicon, manifest, svg, PWA worker, örnek xlsx vb.).
     * `api/` burada negatif lookahead ile hariç; API yukarıdaki matcher'a düşer.
     */
    '/((?!api/|_next/static|_next/image|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp|json|js|map|xlsx|txt|webmanifest)$).*)',
  ],
};
