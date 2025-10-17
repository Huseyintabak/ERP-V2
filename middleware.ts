import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';

// Public paths (login sayfaları)
const publicPaths = ['/login', '/operator-login', '/api/auth/login', '/api/operators/public'];

// Role-based access control mapping (Admin hariç diğer roller için)
const roleAccess: Record<string, string[]> = {
  // Dashboard routes - each role has their own dashboard
  '/yonetici-dashboard': ['yonetici'],
  '/planlama-dashboard': ['planlama'],
  '/depo-dashboard': ['depo'],
  '/operator-dashboard': ['operator'],
  
  // Legacy dashboard redirect
  '/dashboard': ['yonetici', 'planlama', 'depo', 'operator'],
  
  // Module-specific access
  '/stok': ['depo', 'yonetici'],
  '/uretim': ['planlama', 'yonetici'],
  '/kullanicilar': ['yonetici'],
  '/musteriler': ['yonetici', 'planlama'],
  '/ayarlar': ['yonetici'],
  '/bildirimler': ['yonetici', 'planlama', 'depo'],
  '/raporlar': ['yonetici', 'planlama', 'depo'],
  '/islem-gecmisi': ['yonetici'],
  '/sistem-bakim': ['yonetici'],
  '/sirket-yonetimi': ['yonetici'],
  
  // API access control - SPECİFİK PATH'LER ÖNCE!
  '/api/operators/stats': ['operator'],
  '/api/operators/tasks': ['operator'],
  '/api/production/actions': ['operator'],
  '/api/production/log': ['operator'],
  '/api/production/logs': ['operator', 'planlama', 'yonetici'],
  '/api/production/semi-logs': ['operator', 'planlama', 'yonetici'],
  '/api/production/semi-log': ['operator'],
  '/api/production/plan-status': ['operator', 'planlama', 'yonetici'],
  '/api/production/plans': ['planlama', 'yonetici'],
  '/api/bom/snapshot': ['operator', 'planlama', 'yonetici'],
  '/api/bom/semi-snapshot': ['operator', 'planlama', 'yonetici'],
  '/api/bom/semi-snapshot/': ['operator', 'planlama', 'yonetici'],
  '/api/semi-bom': ['operator', 'planlama', 'yonetici'],
  '/api/users': ['yonetici'],
  '/api/settings': ['yonetici'],
  '/api/audit-logs': ['yonetici'],
  '/api/notifications': ['yonetici', 'planlama', 'depo'],
  '/api/stock': ['depo', 'yonetici', 'planlama', 'operator'],
  '/api/orders': ['planlama', 'yonetici'],
  '/api/customers': ['yonetici', 'planlama', 'depo'],
  '/api/bom': ['planlama', 'yonetici', 'operator'],
  '/api/reservations': ['planlama', 'yonetici', 'operator'],
  '/api/production/complete': ['operator', 'planlama', 'yonetici'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public path kontrolü
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Static dosyalar ve API auth endpoint'leri için bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout')
  ) {
    return NextResponse.next();
  }

  // JWT token kontrolü
  const token = request.cookies.get('thunder_token')?.value;

  if (!token) {
    // Token yoksa login'e yönlendir
    const loginUrl = pathname.startsWith('/operator') 
      ? '/operator-login' 
      : '/login';
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  try {
    // JWT'yi doğrula
    const payload = await verifyJWT(token);

    // Admin kullanıcısı tüm sayfalara erişebilir
    if (payload.role === 'yonetici') {
      // Admin için erişim kontrolü yapma
    } else {
      // Diğer roller için erişim kontrolü
      // En uzun path'i bul (daha spesifik olanı önce kontrol et)
      const matchingPaths = Object.entries(roleAccess)
        .filter(([path]) => pathname.startsWith(path))
        .sort(([a], [b]) => b.length - a.length); // En uzun path önce
      
      console.log('🔍 Middleware check:', { pathname, matchingPaths, userRole: payload.role });
      
      if (matchingPaths.length > 0) {
        const [, allowedRoles] = matchingPaths[0];
        console.log('🔍 Allowed roles for path:', allowedRoles);
        if (!allowedRoles.includes(payload.role)) {
          console.log('❌ Access denied for role:', payload.role);
          return NextResponse.redirect(new URL('/403', request.url));
        }
      } else {
        console.log('⚠️ No matching path found for:', pathname);
      }
    }

    // User context'i header olarak ekle (audit log için)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);
    requestHeaders.set('x-user-email', payload.email);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // Invalid veya expired token
    const loginUrl = pathname.startsWith('/operator') 
      ? '/operator-login' 
      : '/login';
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/semi-bom (test için bypass)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/semi-bom).*)',
  ],
};

