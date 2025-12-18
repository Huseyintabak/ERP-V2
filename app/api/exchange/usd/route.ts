import { NextResponse } from 'next/server';

// In-memory cache for USD exchange rate (1 hour TTL)
// TCMB günlük olarak güncelliyor (genellikle saat 15:00'te), bu yüzden 1 saat cache yeterli
interface CachedRate {
  rate: number;
  source: string;
  fetchedAt: string;
  expiresAt: number; // Timestamp
}

let usdRateCache: CachedRate | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 saat

export async function GET() {
  // Cache kontrolü - eğer cache varsa ve henüz expire olmamışsa, cache'den döndür
  const now = Date.now();
  if (usdRateCache && usdRateCache.expiresAt > now) {
    return NextResponse.json({
      currency: 'USD',
      source: usdRateCache.source,
      rate: usdRateCache.rate,
      fetchedAt: usdRateCache.fetchedAt,
      cached: true
    });
  }

  try {
    // PRIMARY: TCMB (Türkiye Cumhuriyet Merkez Bankası)
    // TCMB günlük olarak güncelliyor (genellikle saat 15:00'te)
    try {
      const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
        cache: 'no-store',
        next: { revalidate: 3600 } // Next.js cache: 1 saat
      });
      if (res.ok) {
        const xml = await res.text();
        const banknoteSell = xml.match(/<Currency\s+Kod="USD"[\s\S]*?<BanknoteSelling>(.*?)<\/BanknoteSelling>/);
        const forexSell = xml.match(/<Currency\s+Kod="USD"[\s\S]*?<ForexSelling>(.*?)<\/ForexSelling>/);
        const valueStr = (banknoteSell?.[1] ?? forexSell?.[1] ?? '').replace(',', '.').trim();
        const rate = parseFloat(valueStr);
        if (rate && !Number.isNaN(rate)) {
          // Cache'e kaydet
          usdRateCache = {
            rate,
            source: 'TCMB',
            fetchedAt: new Date().toISOString(),
            expiresAt: now + CACHE_TTL_MS
          };
          return NextResponse.json({ 
            currency: 'USD', 
            source: 'TCMB', 
            rate, 
            fetchedAt: usdRateCache.fetchedAt,
            cached: false
          });
        }
      }
    } catch {}

    // FALLBACK: exchangerate.host (USD->TRY)
    const fx = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=TRY', { 
      cache: 'no-store',
      next: { revalidate: 3600 } // Next.js cache: 1 saat
    });
    if (!fx.ok) throw new Error('Fallback provider failed');
    const data = await fx.json();
    const rate = Number(data?.rates?.TRY);
    if (!rate || Number.isNaN(rate)) throw new Error('USD/TRY not found');
    
    // Cache'e kaydet
    usdRateCache = {
      rate,
      source: 'exchangerate.host',
      fetchedAt: new Date().toISOString(),
      expiresAt: now + CACHE_TTL_MS
    };
    
    return NextResponse.json({ 
      currency: 'USD', 
      source: 'exchangerate.host', 
      rate, 
      fetchedAt: usdRateCache.fetchedAt,
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


