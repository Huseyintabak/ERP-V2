/**
 * Cost Tracker Test
 * OpenAI API maliyet takibi testleri
 */

import { costTracker } from '../cost-tracker';

describe('Cost Tracker', () => {
  beforeEach(() => {
    // Her test öncesi cost tracker'ı reset et
    (costTracker as any).costs = [];
  });

  test('Cost Tracker should calculate cost correctly for gpt-4o', () => {
    const tokens = 1000;
    const cost = costTracker.calculateCost('gpt-4o', tokens);
    
    // 1000 tokens: 800 input (0.005/1K) + 200 output (0.015/1K)
    // Expected: (800/1000) * 0.005 + (200/1000) * 0.015 = 0.004 + 0.003 = 0.007
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01);
  });

  test('Cost Tracker should calculate cost correctly for gpt-4o-mini', () => {
    const tokens = 1000;
    const cost = costTracker.calculateCost('gpt-4o-mini', tokens);
    
    // 1000 tokens: 800 input (0.00015/1K) + 200 output (0.0006/1K)
    // Expected: (800/1000) * 0.00015 + (200/1000) * 0.0006 = 0.00012 + 0.00012 = 0.00024
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.001);
  });

  test('Cost Tracker should use default model for unknown models', () => {
    const tokens = 1000;
    const cost = costTracker.calculateCost('unknown-model', tokens);
    
    // Unknown model için gpt-4o fiyatı kullanılmalı
    expect(cost).toBeGreaterThan(0);
  });

  test('Cost Tracker should track usage and allow when under limit', async () => {
    const entry = {
      agent: 'test-agent',
      model: 'gpt-4o',
      tokens: 1000,
      cost: 0.01,
      timestamp: new Date(),
    };

    const result = await costTracker.trackUsage(entry);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();

    const stats = costTracker.getStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.dailyTotal).toBe(0.01);
  });

  test('Cost Tracker should reject when daily limit exceeded', async () => {
    const dailyLimit = 0.05; // 5 cent
    (costTracker as any).dailyLimit = dailyLimit;

    // Daily limit'i aşacak kadar cost ekle
    for (let i = 0; i < 6; i++) {
      const entry = {
        agent: 'test-agent',
        model: 'gpt-4o',
        tokens: 1000,
        cost: 0.01,
        timestamp: new Date(),
      };
      await costTracker.trackUsage(entry);
    }

    const stats = costTracker.getStats();
    expect(stats.dailyTotal).toBeGreaterThanOrEqual(dailyLimit);

    // Son entry limit aşımına neden olmalı
    const lastEntry = {
      agent: 'test-agent',
      model: 'gpt-4o',
      tokens: 1000,
      cost: 0.01,
      timestamp: new Date(),
    };

    const result = await costTracker.trackUsage(lastEntry);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Daily limit exceeded');
  });

  test('Cost Tracker should reject when weekly limit exceeded', async () => {
    const weeklyLimit = 0.1; // 10 cent
    (costTracker as any).weeklyLimit = weeklyLimit;

    // Weekly limit'i aşacak kadar cost ekle
    for (let i = 0; i < 11; i++) {
      const entry = {
        agent: 'test-agent',
        model: 'gpt-4o',
        tokens: 1000,
        cost: 0.01,
        timestamp: new Date(),
      };
      await costTracker.trackUsage(entry);
    }

    const stats = costTracker.getStats();
    expect(stats.weeklyTotal).toBeGreaterThanOrEqual(weeklyLimit);

    // Son entry limit aşımına neden olmalı
    const lastEntry = {
      agent: 'test-agent',
      model: 'gpt-4o',
      tokens: 1000,
      cost: 0.01,
      timestamp: new Date(),
    };

    const result = await costTracker.trackUsage(lastEntry);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Weekly limit exceeded');
  });

  test('Cost Tracker should calculate daily total correctly', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Bugünkü cost'lar
    (costTracker as any).costs = [
      {
        agent: 'test-agent',
        model: 'gpt-4o',
        tokens: 1000,
        cost: 0.01,
        timestamp: today,
      },
      {
        agent: 'test-agent',
        model: 'gpt-4o',
        tokens: 1000,
        cost: 0.02,
        timestamp: today,
      },
      // Dünkü cost (sayılmamalı)
      {
        agent: 'test-agent',
        model: 'gpt-4o',
        tokens: 1000,
        cost: 0.05,
        timestamp: yesterday,
      },
    ];

    const stats = costTracker.getStats();
    expect(stats.dailyTotal).toBe(0.03); // Sadece bugünkü cost'lar
  });

  test('Cost Tracker should calculate weekly total correctly', () => {
    const today = new Date();
    const eightDaysAgo = new Date(today);
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    // Son 7 gün içindeki cost'lar
    (costTracker as any).costs = [
      {
        agent: 'test-agent',
        model: 'gpt-4o',
        tokens: 1000,
        cost: 0.01,
        timestamp: today,
      },
      {
        agent: 'test-agent',
        model: 'gpt-4o',
        tokens: 1000,
        cost: 0.02,
        timestamp: today,
      },
      // 8 gün önceki cost (sayılmamalı)
      {
        agent: 'test-agent',
        model: 'gpt-4o',
        tokens: 1000,
        cost: 0.05,
        timestamp: eightDaysAgo,
      },
    ];

    const stats = costTracker.getStats();
    expect(stats.weeklyTotal).toBe(0.03); // Sadece son 7 gün içindeki cost'lar
  });

  test('Cost Tracker getStats should return correct statistics', () => {
    const today = new Date();
    (costTracker as any).costs = [
      {
        agent: 'test-agent-1',
        model: 'gpt-4o',
        tokens: 1000,
        cost: 0.01,
        timestamp: today,
      },
      {
        agent: 'test-agent-2',
        model: 'gpt-4o',
        tokens: 1000,
        cost: 0.02,
        timestamp: today,
      },
    ];

    const stats = costTracker.getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.dailyTotal).toBe(0.03);
    expect(stats.dailyLimit).toBeGreaterThan(0);
    expect(stats.weeklyLimit).toBeGreaterThan(0);
  });
});

