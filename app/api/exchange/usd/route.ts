import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // PRIMARY: TCMB
    try {
      const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
        cache: 'no-store'
      });
      if (res.ok) {
        const xml = await res.text();
        const banknoteSell = xml.match(/<Currency\s+Kod="USD"[\s\S]*?<BanknoteSelling>(.*?)<\/BanknoteSelling>/);
        const forexSell = xml.match(/<Currency\s+Kod="USD"[\s\S]*?<ForexSelling>(.*?)<\/ForexSelling>/);
        const valueStr = (banknoteSell?.[1] ?? forexSell?.[1] ?? '').replace(',', '.').trim();
        const rate = parseFloat(valueStr);
        if (rate && !Number.isNaN(rate)) {
          return NextResponse.json({ currency: 'USD', source: 'TCMB', rate, fetchedAt: new Date().toISOString() });
        }
      }
    } catch {}

    // FALLBACK: exchangerate.host (USD->TRY)
    const fx = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=TRY', { cache: 'no-store' });
    if (!fx.ok) throw new Error('Fallback provider failed');
    const data = await fx.json();
    const rate = Number(data?.rates?.TRY);
    if (!rate || Number.isNaN(rate)) throw new Error('USD/TRY not found');
    return NextResponse.json({ currency: 'USD', source: 'exchangerate.host', rate, fetchedAt: new Date().toISOString() });
  } catch (error: any) {
    // Final graceful fallback to avoid breaking UI
    const fallback = process.env.FALLBACK_USD_TRY ? Number(process.env.FALLBACK_USD_TRY) : null;
    if (fallback && !Number.isNaN(fallback)) {
      return NextResponse.json({ currency: 'USD', source: 'fallback', rate: fallback, fetchedAt: new Date().toISOString() });
    }
    // Hardcoded last-resort fallback to avoid 500s in airgapped envs
    const hardcoded = 41.95;
    return NextResponse.json({ currency: 'USD', source: 'fallback-default', rate: hardcoded, fetchedAt: new Date().toISOString() });
  }
}


