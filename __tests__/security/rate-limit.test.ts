/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import { reserveLoginAttempt, clearLoginFailures, getClientIp } from '@/lib/auth/rate-limit';

/** Hak ayrıldıysa 0, blokluysa kalan saniye */
const tryLogin = (ip: string, email: string) => reserveLoginAttempt(ip, email).blockedSeconds;

describe('login rate limiter', () => {
  it('allows 5 attempts per ip+email then blocks', () => {
    for (let i = 0; i < 5; i++) expect(tryLogin('1.1.1.1', 'a@b.com')).toBe(0);
    expect(tryLogin('1.1.1.1', 'a@b.com')).toBeGreaterThan(0);
  });

  it('reserves synchronously so parallel requests cannot exceed the limit', () => {
    const results = Array.from({ length: 50 }, () => tryLogin('2.2.2.2', 'race@x.com'));
    expect(results.filter((r) => r === 0).length).toBe(5);
  });

  it('clears per ip+email counter on successful login', () => {
    for (let i = 0; i < 5; i++) tryLogin('3.3.3.3', 'c@d.com');
    clearLoginFailures('3.3.3.3', 'c@d.com');
    expect(tryLogin('3.3.3.3', 'c@d.com')).toBe(0);
  });

  it('blocks per-email across rotating IPs after 20 attempts', () => {
    let allowed = 0;
    for (let i = 0; i < 40; i++) if (tryLogin(`10.0.${i}.1`, 'victim@x.com') === 0) allowed++;
    expect(allowed).toBe(20);
  });

  it('is case-insensitive on email', () => {
    for (let i = 0; i < 5; i++) tryLogin('4.4.4.4', 'Case@X.com');
    expect(tryLogin('4.4.4.4', 'case@x.com')).toBeGreaterThan(0);
  });

  it('only trusts x-real-ip (set by nginx), ignores x-forwarded-for', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '10.0.0.1', 'x-forwarded-for': '6.6.6.6' }))).toBe('10.0.0.1');
    expect(getClientIp(new Headers({ 'x-forwarded-for': '6.6.6.6' }))).toBe('unknown');
  });
});

describe('login rate limiter — lockout DoS protection', () => {
  it('attacker on other IPs cannot lock out user from a previously-successful IP', () => {
    tryLogin('85.0.0.1', 'owner@x.com');
    clearLoginFailures('85.0.0.1', 'owner@x.com');
    for (let i = 0; i < 40; i++) tryLogin(`66.6.${i}.6`, 'owner@x.com');
    expect(tryLogin('66.6.99.6', 'owner@x.com')).toBeGreaterThan(0);
    expect(tryLogin('85.0.0.1', 'owner@x.com')).toBe(0);
  });
});

describe('login rate limiter — refund (release)', () => {
  it('refunds an attempt on infrastructure errors', () => {
    for (let i = 0; i < 3; i++) tryLogin('7.7.7.8', 'srv@x.com');
    reserveLoginAttempt('7.7.7.8', 'srv@x.com').release(); // 4. deneme altyapı hatası → iade
    expect(tryLogin('7.7.7.8', 'srv@x.com')).toBe(0); // 4.
    expect(tryLogin('7.7.7.8', 'srv@x.com')).toBe(0); // 5.
    expect(tryLogin('7.7.7.8', 'srv@x.com')).toBeGreaterThan(0); // 6. → blok
  });

  it('release is single-use: calling it repeatedly cannot erase other attempts', () => {
    for (let i = 0; i < 4; i++) tryLogin('8.8.8.1', 'once@x.com');
    const r = reserveLoginAttempt('8.8.8.1', 'once@x.com'); // 5. → blok tetiklenir
    for (let i = 0; i < 10; i++) r.release();
    expect(tryLogin('8.8.8.1', 'once@x.com')).toBeGreaterThan(0);

    for (let i = 0; i < 3; i++) tryLogin('8.8.8.2', 'once2@x.com');
    const r2 = reserveLoginAttempt('8.8.8.2', 'once2@x.com'); // 4.
    for (let i = 0; i < 10; i++) r2.release(); // sadece 1 iade → sayaç 3
    expect(tryLogin('8.8.8.2', 'once2@x.com')).toBe(0); // 4.
    expect(tryLogin('8.8.8.2', 'once2@x.com')).toBe(0); // 5.
    expect(tryLogin('8.8.8.2', 'once2@x.com')).toBeGreaterThan(0);
  });

  it('release from a trusted IP does not touch the email-wide counter it never incremented', () => {
    tryLogin('9.0.0.1', 'shared@x.com'); // henüz güvenilir değil → email sayacı 1
    clearLoginFailures('9.0.0.1', 'shared@x.com'); // 9.0.0.1 artık güvenilir
    // saldırgan 18 deneme → email sayacı 19
    for (let i = 0; i < 18; i++) tryLogin(`5.5.${i}.5`, 'shared@x.com');
    // güvenilir IP'den rezervasyon + iade, email sayacını azaltmamalı
    for (let i = 0; i < 10; i++) reserveLoginAttempt('9.0.0.1', 'shared@x.com').release();
    // 20. saldırgan denemesi hâlâ son hak, 21. bloklanmalı
    expect(tryLogin('5.5.99.5', 'shared@x.com')).toBe(0);
    expect(tryLogin('5.5.98.5', 'shared@x.com')).toBeGreaterThan(0);
  });
});
