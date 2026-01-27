/**
 * Rate Limiter Test
 * API rate limiting testleri
 */

import { rateLimiter } from '../rate-limiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Her test öncesi rate limiter'ı reset et
    rateLimiter.reset();
  });

  test('Rate Limiter should allow requests under limit', () => {
    const result = rateLimiter.checkLimit('test-agent');
    
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  test('Rate Limiter should reject requests over limit', () => {
    const maxRequests = 5; // Test için düşük limit
    const testLimiter = new (rateLimiter.constructor as any)(maxRequests, 60000);
    
    // Limit'e kadar request gönder
    for (let i = 0; i < maxRequests; i++) {
      const result = testLimiter.checkLimit('test-agent');
      expect(result.allowed).toBe(true);
    }
    
    // Limit aşımı
    const result = testLimiter.checkLimit('test-agent');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test('Rate Limiter should track requests per agent separately', () => {
    const maxRequests = 5;
    const testLimiter = new (rateLimiter.constructor as any)(maxRequests, 60000);
    
    // Agent 1 için limit'e kadar request
    for (let i = 0; i < maxRequests; i++) {
      testLimiter.checkLimit('agent-1');
    }
    
    // Agent 1 limit aşımı
    const agent1Result = testLimiter.checkLimit('agent-1');
    expect(agent1Result.allowed).toBe(false);
    
    // Agent 2 hala request gönderebilmeli
    const agent2Result = testLimiter.checkLimit('agent-2');
    expect(agent2Result.allowed).toBe(true);
  });

  test('Rate Limiter should reset specific agent', () => {
    const maxRequests = 5;
    const testLimiter = new (rateLimiter.constructor as any)(maxRequests, 60000);
    
    // Agent için limit'e kadar request
    for (let i = 0; i < maxRequests; i++) {
      testLimiter.checkLimit('test-agent');
    }
    
    // Limit aşımı
    let result = testLimiter.checkLimit('test-agent');
    expect(result.allowed).toBe(false);
    
    // Reset
    testLimiter.reset('test-agent');
    
    // Tekrar request gönderebilmeli
    result = testLimiter.checkLimit('test-agent');
    expect(result.allowed).toBe(true);
  });

  test('Rate Limiter should reset all agents', () => {
    const maxRequests = 5;
    const testLimiter = new (rateLimiter.constructor as any)(maxRequests, 60000);
    
    // Birden fazla agent için limit'e kadar request
    for (let i = 0; i < maxRequests; i++) {
      testLimiter.checkLimit('agent-1');
      testLimiter.checkLimit('agent-2');
    }
    
    // Her iki agent da limit aşımı
    expect(testLimiter.checkLimit('agent-1').allowed).toBe(false);
    expect(testLimiter.checkLimit('agent-2').allowed).toBe(false);
    
    // Reset all
    testLimiter.reset();
    
    // Her iki agent da tekrar request gönderebilmeli
    expect(testLimiter.checkLimit('agent-1').allowed).toBe(true);
    expect(testLimiter.checkLimit('agent-2').allowed).toBe(true);
  });

  test('Rate Limiter should expire old requests', async () => {
    const maxRequests = 5;
    const windowMs = 100; // 100ms window (test için kısa)
    const testLimiter = new (rateLimiter.constructor as any)(maxRequests, windowMs);
    
    // Limit'e kadar request gönder
    for (let i = 0; i < maxRequests; i++) {
      testLimiter.checkLimit('test-agent');
    }
    
    // Limit aşımı
    let result = testLimiter.checkLimit('test-agent');
    expect(result.allowed).toBe(false);
    
    // Window süresi geçene kadar bekle
    await new Promise(resolve => setTimeout(resolve, windowMs + 10));
    
    // Artık request gönderebilmeli (eski request'ler expire oldu)
    result = testLimiter.checkLimit('test-agent');
    expect(result.allowed).toBe(true);
  });

  test('Rate Limiter getStats should return correct statistics', () => {
    const maxRequests = 5;
    const testLimiter = new (rateLimiter.constructor as any)(maxRequests, 60000);
    
    // Birden fazla agent için request gönder
    testLimiter.checkLimit('agent-1');
    testLimiter.checkLimit('agent-1');
    testLimiter.checkLimit('agent-2');
    
    const stats = testLimiter.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byAgent['agent-1']).toBe(2);
    expect(stats.byAgent['agent-2']).toBe(1);
  });

  test('Rate Limiter getStats should return stats for specific agent', () => {
    const maxRequests = 5;
    const testLimiter = new (rateLimiter.constructor as any)(maxRequests, 60000);
    
    testLimiter.checkLimit('agent-1');
    testLimiter.checkLimit('agent-1');
    testLimiter.checkLimit('agent-2');
    
    const stats = testLimiter.getStats('agent-1');
    expect(stats.total).toBe(2);
    expect(stats.byAgent['agent-1']).toBe(2);
  });

  test('Rate Limiter should handle case-insensitive agent names', () => {
    const maxRequests = 5;
    const testLimiter = new (rateLimiter.constructor as any)(maxRequests, 60000);
    
    // Farklı case'lerle aynı agent
    testLimiter.checkLimit('Test-Agent');
    testLimiter.checkLimit('test-agent');
    testLimiter.checkLimit('TEST-AGENT');
    
    // Hepsi aynı agent olarak sayılmalı
    const stats = testLimiter.getStats('test-agent');
    expect(stats.total).toBe(3);
  });
});

