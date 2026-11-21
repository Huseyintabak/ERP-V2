/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import {
  getLoginBlockSeconds,
  recordLoginFailure,
  clearLoginFailures,
  getClientIp,
} from '@/lib/auth/rate-limit';

describe('login rate limiter', () => {
  it('blocks after 5 failures', () => {
    const key = '1.2.3.4|a@b.com';
    for (let i = 0; i < 4; i++) recordLoginFailure(key);
    expect(getLoginBlockSeconds(key)).toBe(0);
    recordLoginFailure(key);
    expect(getLoginBlockSeconds(key)).toBeGreaterThan(0);
  });

  it('clears on success', () => {
    const key = '1.2.3.4|c@d.com';
    for (let i = 0; i < 5; i++) recordLoginFailure(key);
    clearLoginFailures(key);
    expect(getLoginBlockSeconds(key)).toBe(0);
  });

  it('keys are isolated per ip+email', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure('9.9.9.9|x@y.com');
    expect(getLoginBlockSeconds('8.8.8.8|x@y.com')).toBe(0);
  });

  it('prefers x-real-ip over spoofable x-forwarded-for', () => {
    const h = new Headers({ 'x-real-ip': '10.0.0.1', 'x-forwarded-for': '6.6.6.6, 10.0.0.1' });
    expect(getClientIp(h)).toBe('10.0.0.1');
  });
});
