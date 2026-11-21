/**
 * Basit in-memory login rate limiter.
 *
 * Tek instance (PM2 fork, instances: 1) için yeterli. Birden fazla instance'a
 * geçilirse Postgres/Redis tabanlı bir sayaca taşınmalı.
 */

interface Attempt {
  count: number;
  firstAt: number;
  blockedUntil: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 dk içinde
const MAX_FAILURES = 5; // en fazla 5 başarısız deneme
const BLOCK_MS = 15 * 60 * 1000; // aşılırsa 15 dk blok

const attempts = new Map<string, Attempt>();

function cleanup(now: number) {
  if (attempts.size < 1000) return;
  for (const [key, a] of attempts) {
    if (a.blockedUntil < now && now - a.firstAt > WINDOW_MS) attempts.delete(key);
  }
}

/** Blokluysa kalan saniyeyi, değilse 0 döndürür */
export function getLoginBlockSeconds(key: string): number {
  const a = attempts.get(key);
  const now = Date.now();
  if (!a || a.blockedUntil <= now) return 0;
  return Math.ceil((a.blockedUntil - now) / 1000);
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  cleanup(now);
  const a = attempts.get(key);
  if (!a || now - a.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, blockedUntil: 0 });
    return;
  }
  a.count += 1;
  if (a.count >= MAX_FAILURES) {
    a.blockedUntil = now + BLOCK_MS;
  }
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}

export function getClientIp(headers: Headers): string {
  // Nginx X-Real-IP set eder; X-Forwarded-For'un ilk elemanı client tarafından sahtelenebilir
  return (
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',').pop()?.trim() ||
    'unknown'
  );
}
