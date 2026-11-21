/**
 * Basit in-memory login rate limiter.
 *
 * Tek instance (PM2 fork, instances: 1) için yeterli. Birden fazla instance'a
 * geçilirse Postgres/Redis tabanlı bir sayaca taşınmalı.
 *
 * İki katman:
 *  - IP + email: 5 deneme / 15 dk  (normal kullanıcı hatası için)
 *  - sadece email: 20 deneme / 15 dk (IP değiştirerek deneme yapan saldırgana karşı)
 *
 * Yarış durumuna karşı deneme hakkı `reserveLoginAttempt` ile await'ten ÖNCE,
 * senkron olarak düşülür; başarılı login'de `clearLoginFailures` ile sıfırlanır.
 */

interface Attempt {
  count: number;
  firstAt: number;
  blockedUntil: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_PER_IP_EMAIL = 5;
const MAX_PER_EMAIL = 20;

const attempts = new Map<string, Attempt>();

function cleanup(now: number) {
  if (attempts.size < 5000) return;
  for (const [key, a] of attempts) {
    if (a.blockedUntil < now && now - a.firstAt > WINDOW_MS) attempts.delete(key);
  }
}

function blockedSeconds(key: string, now: number): number {
  const a = attempts.get(key);
  if (!a || a.blockedUntil <= now) return 0;
  return Math.ceil((a.blockedUntil - now) / 1000);
}

function increment(key: string, max: number, now: number) {
  const a = attempts.get(key);
  if (!a || now - a.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, blockedUntil: max <= 1 ? now + BLOCK_MS : 0 });
    return;
  }
  a.count += 1;
  if (a.count >= max) a.blockedUntil = now + BLOCK_MS;
}

const ipKey = (ip: string, email: string) => `ip|${ip}|${email.toLowerCase()}`;
const emailKey = (email: string) => `em|${email.toLowerCase()}`;

/**
 * Deneme hakkını atomik olarak (senkron) ayırır.
 * Blokluysa kalan saniyeyi döndürür ve sayaç artırılmaz; değilse 0 döndürür ve
 * denemeyi başarısız sayar (başarılı olursa clearLoginFailures çağrılmalı).
 */
export function reserveLoginAttempt(ip: string, email: string): number {
  const now = Date.now();
  cleanup(now);
  const blocked = Math.max(blockedSeconds(ipKey(ip, email), now), blockedSeconds(emailKey(email), now));
  if (blocked > 0) return blocked;
  increment(ipKey(ip, email), MAX_PER_IP_EMAIL, now);
  increment(emailKey(email), MAX_PER_EMAIL, now);
  return 0;
}

export function clearLoginFailures(ip: string, email: string): void {
  attempts.delete(ipKey(ip, email));
  attempts.delete(emailKey(email));
}

/**
 * Nginx `proxy_set_header X-Real-IP $remote_addr` ile client'ın gönderdiği değeri ezer.
 * Uygulama sadece 127.0.0.1'e bağlı olduğundan (Nginx dışından erişilemez) bu header güvenilirdir.
 * X-Forwarded-For'a bilerek bakılmaz (client tarafından eklenebilir).
 */
export function getClientIp(headers: Headers): string {
  return headers.get('x-real-ip')?.trim() || 'unknown';
}
