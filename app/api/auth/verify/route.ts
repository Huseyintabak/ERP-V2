import { NextResponse } from 'next/server';

/**
 * GET /api/auth/verify
 *
 * Nginx `auth_request` için hafif kontrol noktası (DB'ye gitmez).
 * JWT doğrulaması middleware'de yapılır; buraya ulaşan istek zaten geçerli token taşır.
 * Geçersizse middleware 401 döner. Realtime websocket'i login olmuş kullanıcılara kısıtlamak için kullanılır.
 */
export function GET() {
  return new NextResponse(null, { status: 204 });
}
