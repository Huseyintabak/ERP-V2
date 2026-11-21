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

const TRUSTED_IP_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

const attempts = new Map<string, Attempt>();
/** email → (ip → son başarılı login zamanı). Bu IP'ler email-geneli bloktan muaftır. */
const trustedIps = new Map<string, Map<string, number>>();

function cleanup(now: number) {
  if (attempts.size >= 5000) {
    for (const [key, a] of attempts) {
      if (a.blockedUntil < now && now - a.firstAt > WINDOW_MS) attempts.delete(key);
    }
  }
  if (trustedIps.size >= 5000) {
    for (const [email, ips] of trustedIps) {
      for (const [ip, at] of ips) if (now - at > TRUSTED_IP_TTL_MS) ips.delete(ip);
      if (ips.size === 0) trustedIps.delete(email);
    }
  }
}

function isTrustedIp(ip: string, email: string, now: number): boolean {
  const at = trustedIps.get(email.toLowerCase())?.get(ip);
  return at !== undefined && now - at <= TRUSTED_IP_TTL_MS;
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
  const trusted = isTrustedIp(ip, email, now);
  // Email-geneli blok, hesabın daha önce başarıyla giriş yaptığı IP'lere uygulanmaz:
  // saldırgan başka IP'lerden deneyerek gerçek kullanıcıyı kilitleyemez.
  const blocked = Math.max(
    blockedSeconds(ipKey(ip, email), now),
    trusted ? 0 : blockedSeconds(emailKey(email), now)
  );
  if (blocked > 0) return blocked;
  increment(ipKey(ip, email), MAX_PER_IP_EMAIL, now);
  if (!trusted) increment(emailKey(email), MAX_PER_EMAIL, now);
  return 0;
}

/** Başarılı login: bu IP+email sayacını sıfırla ve IP'yi hesap için güvenilir işaretle */
export function clearLoginFailures(ip: string, email: string): void {
  attempts.delete(ipKey(ip, email));
  const key = email.toLowerCase();
  let ips = trustedIps.get(key);
  if (!ips) trustedIps.set(key, (ips = new Map()));
  ips.set(ip, Date.now());
}

/** Sunucu hatası (5xx) gibi kullanıcıdan kaynaklanmayan durumlarda ayrılan hakkı iade et */
export function releaseLoginAttempt(ip: string, email: string): void {
  for (const key of [ipKey(ip, email), emailKey(email)]) {
    const a = attempts.get(key);
    if (a && a.count > 0 && a.blockedUntil === 0) a.count -= 1;
  }
}

/**
 * Nginx `proxy_set_header X-Real-IP $remote_addr` ile client'ın gönderdiği değeri ezer.
 * Uygulama sadece 127.0.0.1'e bağlı olduğundan (Nginx dışından erişilemez) bu header güvenilirdir.
 * X-Forwarded-For'a bilerek bakılmaz (client tarafından eklenebilir).
 */
export function getClientIp(headers: Headers): string {
  return headers.get('x-real-ip')?.trim() || 'unknown';
}
