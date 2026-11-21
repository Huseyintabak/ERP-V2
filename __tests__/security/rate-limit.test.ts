/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import {
  reserveLoginAttempt,
  clearLoginFailures,
  releaseLoginAttempt,
  getClientIp,
} from '@/lib/auth/rate-limit';

describe('login rate limiter — lockout DoS protection', () => {
  it('attacker on other IPs cannot lock out user from a previously-successful IP', () => {
    // gerçek kullanıcı ofis IP'sinden daha önce giriş yapmış
    reserveLoginAttempt('85.0.0.1', 'owner@x.com');
    clearLoginFailures('85.0.0.1', 'owner@x.com');
    // saldırgan farklı IP'lerden 40 deneme yapıyor → email-geneli blok devreye giriyor
    for (let i = 0; i < 40; i++) reserveLoginAttempt(`66.6.${i}.6`, 'owner@x.com');
    expect(reserveLoginAttempt('66.6.99.6', 'owner@x.com')).toBeGreaterThan(0);
    // gerçek kullanıcı güvenilir IP'sinden hâlâ girebilir
    expect(reserveLoginAttempt('85.0.0.1', 'owner@x.com')).toBe(0);
  });

  it('releaseLoginAttempt refunds an attempt on server errors', () => {
    for (let i = 0; i < 4; i++) reserveLoginAttempt('7.7.7.7', 'srv@x.com');
    reserveLoginAttempt('7.7.7.7', 'srv@x.com'); // 5. deneme → blok
    expect(reserveLoginAttempt('7.7.7.7', 'srv@x.com')).toBeGreaterThan(0);

    for (let i = 0; i < 4; i++) reserveLoginAttempt('7.7.7.8', 'srv2@x.com');
    releaseLoginAttempt('7.7.7.8', 'srv2@x.com'); // 4. deneme 5xx ile bitti → iade
    expect(reserveLoginAttempt('7.7.7.8', 'srv2@x.com')).toBe(0); // 4. hak (iade edilen)
    expect(reserveLoginAttempt('7.7.7.8', 'srv2@x.com')).toBe(0); // 5. hak
    expect(reserveLoginAttempt('7.7.7.8', 'srv2@x.com')).toBeGreaterThan(0); // 6. → blok
  });
});

describe('login rate limiter', () => {
  it('allows 5 attempts per ip+email then blocks', () => {
    for (let i = 0; i < 5; i++) expect(reserveLoginAttempt('1.1.1.1', 'a@b.com')).toBe(0);
    expect(reserveLoginAttempt('1.1.1.1', 'a@b.com')).toBeGreaterThan(0);
  });

  it('reserves synchronously so parallel requests cannot exceed the limit', () => {
    // 50 "paralel" istek: hepsi await'ten önce reserve eder
    const results = Array.from({ length: 50 }, () => reserveLoginAttempt('2.2.2.2', 'race@x.com'));
    expect(results.filter((r) => r === 0).length).toBe(5);
  });

  it('clears on successful login', () => {
    for (let i = 0; i < 5; i++) reserveLoginAttempt('3.3.3.3', 'c@d.com');
    clearLoginFailures('3.3.3.3', 'c@d.com');
    expect(reserveLoginAttempt('3.3.3.3', 'c@d.com')).toBe(0);
  });

  it('blocks per-email across rotating IPs after 20 attempts', () => {
    let allowed = 0;
    for (let i = 0; i < 40; i++) {
      if (reserveLoginAttempt(`10.0.${i}.1`, 'victim@x.com') === 0) allowed++;
    }
    expect(allowed).toBe(20);
  });

  it('is case-insensitive on email', () => {
    for (let i = 0; i < 5; i++) reserveLoginAttempt('4.4.4.4', 'Case@X.com');
    expect(reserveLoginAttempt('4.4.4.4', 'case@x.com')).toBeGreaterThan(0);
  });

  it('only trusts x-real-ip (set by nginx), ignores x-forwarded-for', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '10.0.0.1', 'x-forwarded-for': '6.6.6.6' }))).toBe('10.0.0.1');
    expect(getClientIp(new Headers({ 'x-forwarded-for': '6.6.6.6' }))).toBe('unknown');
  });
});
