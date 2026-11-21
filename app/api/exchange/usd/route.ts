import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for USD exchange rate
// Cache her gün Türkiye saati (UTC+3) ile 08:00'de sıfırlanır
interface CachedRate {
  rate: number;
  source: string;
  fetchedAt: string;
  expiresAt: number; // Timestamp
}

let usdRateCache: CachedRate | null = null;

/**
 * Bir sonraki 08:00 Türkiye saatinin UTC timestamp'ini döndürür.
 * Türkiye = UTC+3. Yani 08:00 TR = 05:00 UTC.
 */
function getNext8amTRTimestamp(): number {
  const TR_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3
  const nowUTC = Date.now();

  // Şu anı TR saatine çevir (UTC dizinde düşünceli olmak için UTC metodlarını kullan)
  const nowTRDate = new Date(nowUTC + TR_OFFSET_MS);
  // Bugünün 08:00 TR zamanını UTC olarak hesapla
  const today8amTR = Date.UTC(
    nowTRDate.getUTCFullYear(),
    nowTRDate.getUTCMonth(),
    nowTRDate.getUTCDate(),
    8, 0, 0, 0
  ) - TR_OFFSET_MS; // TR 08:00 → UTC 05:00

  if (nowUTC < today8amTR) {
    // Henüz bugünün 08:00 TR'si geçmedi
    return today8amTR;
  }
  // Bugünün 08:00'i geçmiş, yarınki 08:00'e kadar bekle
  return today8amTR + 24 * 60 * 60 * 1000;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  if (forceRefresh) {
    usdRateCache = null;
  }

  const now = Date.now();
  // Cache kontrolü - refresh yoksa ve cache varsa, cache'den döndür
  if (!forceRefresh && usdRateCache && usdRateCache.expiresAt > now) {
    return NextResponse.json({
      currency: 'USD',
      source: usdRateCache.source,
      rate: usdRateCache.rate,
      fetchedAt: usdRateCache.fetchedAt,
      nextUpdateAt: new Date(usdRateCache.expiresAt).toISOString(),
      cached: true
    });
  }

  try {
    // PRIMARY: TCMB (Türkiye Cumhuriyet Merkez Bankası)
    // TCMB günlük olarak güncelliyor (genellikle saat 15:00'te)
    try {
      const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
        cache: 'no-store'
      });
      if (res.ok) {
        const xml = await res.text();
        const banknoteSell = xml.match(/<Currency[^>]*Kod="USD"[^>]*>[\s\S]*?<BanknoteSelling>(.*?)<\/BanknoteSelling>/);
        const forexSell = xml.match(/<Currency[^>]*Kod="USD"[^>]*>[\s\S]*?<ForexSelling>(.*?)<\/ForexSelling>/);
        const valueStr = (banknoteSell?.[1] ?? forexSell?.[1] ?? '').replace(',', '.').trim();
        const rate = parseFloat(valueStr);
        if (rate && !Number.isNaN(rate)) {
          // Cache'e kaydet — bir sonraki 08:00 TR saatine kadar geçerli
          usdRateCache = {
            rate,
            source: 'TCMB',
            fetchedAt: new Date().toISOString(),
            expiresAt: getNext8amTRTimestamp()
          };
          return NextResponse.json({ 
            currency: 'USD', 
            source: 'TCMB', 
            rate, 
            fetchedAt: usdRateCache.fetchedAt,
            nextUpdateAt: new Date(usdRateCache.expiresAt).toISOString(),
            cached: false
          });
        }
      }
    } catch {}

    // FALLBACK: exchangerate.host (USD->TRY)
    const fx = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=TRY', { 
      cache: 'no-store'
    });
    if (!fx.ok) throw new Error('Fallback provider failed');
    const data = await fx.json();
    const rate = Number(data?.rates?.TRY);
    if (!rate || Number.isNaN(rate)) throw new Error('USD/TRY not found');
    
    // Cache'e kaydet — bir sonraki 08:00 TR saatine kadar geçerli
    usdRateCache = {
      rate,
      source: 'exchangerate.host',
      fetchedAt: new Date().toISOString(),
      expiresAt: getNext8amTRTimestamp()
    };
    
    return NextResponse.json({ 
      currency: 'USD', 
      source: 'exchangerate.host', 
      rate, 
      fetchedAt: usdRateCache.fetchedAt,
      nextUpdateAt: new Date(usdRateCache.expiresAt).toISOString(),
      cached: false
    });
  } catch (error: any) {
    // Final graceful fallback to avoid breaking UI
    const fallback = process.env.FALLBACK_USD_TRY ? Number(process.env.FALLBACK_USD_TRY) : null;
    if (fallback && !Number.isNaN(fallback)) {
      return NextResponse.json({ 
        currency: 'USD', 
        source: 'fallback', 
        rate: fallback, 
        fetchedAt: new Date().toISOString(),
        cached: false
      });
    }
    // Hardcoded last-resort fallback to avoid 500s in airgapped envs
    const hardcoded = 41.95;
    return NextResponse.json({ 
      currency: 'USD', 
      source: 'fallback-default', 
      rate: hardcoded, 
      fetchedAt: new Date().toISOString(),
      cached: false
    });
  }
}


