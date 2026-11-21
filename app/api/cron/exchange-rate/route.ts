import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/cron/exchange-rate
 *
 * Her gün 08:00 Türkiye saatinde çağrılarak dolar kurunu TCMB'den günceller.
 * Güvenlik: CRON_SECRET env değişkeni ile korunur.
 *
 * Örnek crontab (sunucuda):
 *   0 5 * * * curl -s -X POST http://localhost:3000/api/cron/exchange-rate \
 *       -H "Authorization: Bearer <CRON_SECRET>"
 * (08:00 TR = 05:00 UTC)
 */
export async function POST(request: NextRequest) {
  // Güvenlik kontrolü
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Internal API'yi force-refresh ile çağır
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/exchange/usd?refresh=true`, {
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Exchange rate fetch failed', status: res.status }, { status: 502 });
    }

    const data = await res.json();
    const now = new Date().toISOString();

    console.log(`[cron/exchange-rate] ${now} → ₺${data.rate} (${data.source})`);

    return NextResponse.json({
      success: true,
      rate: data.rate,
      source: data.source,
      fetchedAt: data.fetchedAt,
      nextUpdateAt: data.nextUpdateAt,
      triggeredAt: now
    });
  } catch (error: any) {
    console.error('[cron/exchange-rate] Error:', error?.message);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
}
