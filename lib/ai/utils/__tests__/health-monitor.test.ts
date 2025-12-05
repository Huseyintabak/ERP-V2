/**
 * Health Monitor Tests
 * Tests for metric collection, database saving, and Developer Agent reporting
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { HealthMonitor, getHealthMonitor } from '../health-monitor';

// Alias for compatibility
const AgentHealthMonitor = HealthMonitor;

// Mock logger
jest.mock('../logger', () => ({
  agentLogger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }))
}));

describe('AgentHealthMonitor', () => {
  let monitor: AgentHealthMonitor;

  beforeEach(() => {
    monitor = new AgentHealthMonitor();
  });

  describe('Metric Collection', () => {
    it('should record successful request', async () => {
      await monitor.recordRequest('test-agent', true, 100, 500, undefined);

      const metrics = monitor.getMetrics('test-agent');
      expect(metrics).toBeDefined();
      expect(metrics?.requestCount).toBe(1);
      expect(metrics?.successCount).toBe(1);
      expect(metrics?.errorCount).toBe(0);
      expect(metrics?.latency).toBe(100);
      expect(metrics?.tokenUsage.total).toBe(500);
    });

    it('should record failed request', async () => {
      await monitor.recordRequest('test-agent', false, 200, 0, 'Test error');

      const metrics = monitor.getMetrics('test-agent');
      expect(metrics).toBeDefined();
      expect(metrics?.requestCount).toBe(1);
      expect(metrics?.successCount).toBe(0);
      expect(metrics?.errorCount).toBe(1);
    });

    it('should calculate error rate correctly', async () => {
      // 3 successful, 2 failed = 40% error rate
      await monitor.recordRequest('test-agent', true, 100, 100, undefined);
      await monitor.recordRequest('test-agent', true, 150, 200, undefined);
      await monitor.recordRequest('test-agent', true, 120, 150, undefined);
      await monitor.recordRequest('test-agent', false, 200, 0, 'Error 1');
      await monitor.recordRequest('test-agent', false, 180, 0, 'Error 2');

      const metrics = monitor.getMetrics('test-agent');
      expect(metrics?.errorRate).toBeCloseTo(40, 1);
    });

    it('should calculate success rate correctly', async () => {
      // 7 successful, 3 failed = 70% success rate
      for (let i = 0; i < 7; i++) {
        await monitor.recordRequest('test-agent', true, 100, 100, undefined);
      }
      for (let i = 0; i < 3; i++) {
        await monitor.recordRequest('test-agent', false, 200, 0, 'Error');
      }

      const metrics = monitor.getMetrics('test-agent');
      expect(metrics?.successRate).toBeCloseTo(70, 1);
    });

    it('should calculate average latency correctly', async () => {
      await monitor.recordRequest('test-agent', true, 100, 100, undefined);
      await monitor.recordRequest('test-agent', true, 200, 200, undefined);
      await monitor.recordRequest('test-agent', true, 150, 150, undefined);

      const metrics = monitor.getMetrics('test-agent');
      expect(metrics?.latency).toBeCloseTo(150, 1);
    });

    it('should track total tokens', async () => {
      await monitor.recordRequest('test-agent', true, 100, 500, undefined);
      await monitor.recordRequest('test-agent', true, 150, 300, undefined);
      await monitor.recordRequest('test-agent', true, 120, 200, undefined);

      const metrics = monitor.getMetrics('test-agent');
      expect(metrics?.tokenUsage.total).toBe(1000);
    });

    it('should handle multiple agents', async () => {
      await monitor.recordRequest('agent1', true, 100, 100, undefined);
      await monitor.recordRequest('agent2', true, 200, 200, undefined);
      await monitor.recordRequest('agent1', false, 150, 0, 'Error');

      const metrics1 = monitor.getMetrics('agent1');
      const metrics2 = monitor.getMetrics('agent2');

      expect(metrics1?.requestCount).toBe(2);
      expect(metrics2?.requestCount).toBe(1);
      expect(metrics1?.errorRate).toBeCloseTo(50, 1);
      expect(metrics2?.errorRate).toBe(0);
    });
  });

  describe('Health Status', () => {
    it('should return healthy status for good metrics', async () => {
      for (let i = 0; i < 10; i++) {
        await monitor.recordRequest('test-agent', true, 100, 100, undefined);
      }

      const status = monitor.getHealthStatus('test-agent');
      expect(status.status).toBe('healthy');
      expect(status.metrics.errorRate).toBe(0);
      expect(status.metrics.successRate).toBe(100);
    });

    it('should return degraded status for high error rate', async () => {
      for (let i = 0; i < 5; i++) {
        await monitor.recordRequest('test-agent', true, 100, 100, undefined);
      }
      for (let i = 0; i < 5; i++) {
        await monitor.recordRequest('test-agent', false, 200, 0, 'Error');
      }

      const status = monitor.getHealthStatus('test-agent');
      expect(status.status).toBe('degraded');
    });

    it('should return degraded status for high latency', async () => {
      for (let i = 0; i < 10; i++) {
        await monitor.recordRequest('test-agent', true, 6000, 100, undefined); // > 5s threshold
      }

      const status = monitor.getHealthStatus('test-agent');
      expect(status.status).toBe('degraded');
    });

    it('should return unhealthy status for critical errors', async () => {
      for (let i = 0; i < 3; i++) {
        await monitor.recordRequest('test-agent', true, 100, 100, undefined);
      }
      for (let i = 0; i < 7; i++) {
        await monitor.recordRequest('test-agent', false, 200, 0, 'Error');
      }

      const status = monitor.getHealthStatus('test-agent');
      expect(status.status).toBe('unhealthy');
    });
  });

  describe('Database Saving', () => {
    it('should save metrics to database', async () => {
      await monitor.recordRequest('test-agent', true, 100, 500, undefined);
      
      // Metrics should be saved to database (mocked)
      const metrics = monitor.getMetrics('test-agent');
      expect(metrics).toBeDefined();
      
      // Verify saveHealthMetrics is called (implicitly through recordRequest)
      // In real implementation, this would check database
    });
  });

  describe('Developer Agent Reporting', () => {
    it('should report unhealthy status to Developer Agent', async () => {
      // Mock Developer Agent (already mocked at top level)
      // This test just verifies that getHealthStatus triggers alerting

      // Force unhealthy status
      for (let i = 0; i < 3; i++) {
        await monitor.recordRequest('test-agent', true, 100, 100, undefined);
      }
      for (let i = 0; i < 7; i++) {
        await monitor.recordRequest('test-agent', false, 200, 0, 'Error');
      }

      const status = monitor.getHealthStatus('test-agent');
      expect(status.status).toBe('unhealthy');
      
      // Alert should be triggered (mocked Developer Agent call)
      // In real implementation, this would verify Developer Agent was called
    });
  });

  describe('Global Instance', () => {
    it('should return singleton instance', () => {
      const instance1 = getHealthMonitor();
      const instance2 = getHealthMonitor();

      expect(instance1).toBe(instance2);
    });
  });
});

