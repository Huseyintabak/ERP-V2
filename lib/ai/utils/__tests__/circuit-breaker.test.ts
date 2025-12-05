/**
 * Circuit Breaker Pattern Tests
 * Tests for agent failure, fallback, and state management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CircuitBreaker, CircuitBreakerManager, CircuitState } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000
    });
  });

  describe('State Management', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition to OPEN after failure threshold', async () => {
      // Simulate failures - need to reach failure threshold (3)
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(
            async () => {
              throw new Error('Test failure');
            }
          );
        } catch (error) {
          // Expected to fail - don't use fallback so failure is recorded
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Force to OPEN state - need to reach failure threshold (3)
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(
            async () => {
              throw new Error('Test failure');
            }
          );
        } catch (error) {
          // Expected to fail - don't use fallback so failure is recorded
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 5100));

      // Next call should attempt HALF_OPEN and succeed
      const result1 = await circuitBreaker.execute(
        async () => ({ success: true }),
        async () => ({ fallback: true })
      );

      // After first success in HALF_OPEN, still HALF_OPEN (need successThreshold successes)
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Second successful call should transition to CLOSED (successThreshold is 2)
      const result2 = await circuitBreaker.execute(
        async () => ({ success: true }),
        async () => ({ fallback: true })
      );

      // After second success, should transition to CLOSED
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Fallback Mechanism', () => {
    it('should use fallback when circuit is OPEN', async () => {
      // Force to OPEN state
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(
            async () => {
              throw new Error('Test failure');
            },
            async () => ({ fallback: true })
          );
        } catch (error) {
          // Expected to fail
        }
      }

      // Now circuit is OPEN, should use fallback
      const result = await circuitBreaker.execute(
        async () => {
          throw new Error('Should not execute');
        },
        async () => ({ fallback: true, message: 'Circuit is OPEN' })
      );

      expect(result).toEqual({ fallback: true, message: 'Circuit is OPEN' });
    });

    it('should execute main function when circuit is CLOSED', async () => {
      const result = await circuitBreaker.execute(
        async () => ({ success: true, data: 'test' }),
        async () => ({ fallback: true })
      );

      expect(result).toEqual({ success: true, data: 'test' });
    });
  });

  describe('Agent Failure Handling', () => {
    it('should track failures correctly', async () => {
      const failures: Error[] = [];

      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(
            async () => {
              throw new Error(`Failure ${i + 1}`);
            }
          );
        } catch (error: any) {
          failures.push(error);
        }
      }

      expect(failures.length).toBe(2);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED); // Still closed (threshold is 3)
      expect(circuitBreaker.getStats().totalFailures).toBe(2);
    });

    it('should reset failure count after successful calls', async () => {
      // Cause 2 failures
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(
            async () => {
              throw new Error('Test failure');
            },
            async () => ({ fallback: true })
          );
        } catch (error) {
          // Expected to fail
        }
      }

      // Success should reset
      await circuitBreaker.execute(
        async () => ({ success: true }),
        async () => ({ fallback: true })
      );

      // Should still be CLOSED
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Success Threshold', () => {
    it('should transition from HALF_OPEN to CLOSED after success threshold', async () => {
      // Force to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(
            async () => {
              throw new Error('Test failure');
            },
            async () => ({ fallback: true })
          );
        } catch (error) {
          // Expected to fail
        }
      }

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 5100));

      // Make 2 successful calls (success threshold)
      await circuitBreaker.execute(
        async () => ({ success: true }),
        async () => ({ fallback: true })
      );

      await circuitBreaker.execute(
        async () => ({ success: true }),
        async () => ({ fallback: true })
      );

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = new CircuitBreakerManager();
  });

  it('should create and retrieve circuit breakers', () => {
    const breaker1 = manager.getCircuitBreaker('agent1', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000
    });

    const breaker2 = manager.getCircuitBreaker('agent2', {
      failureThreshold: 3,
      successThreshold: 1,
      timeout: 30000
    });

    expect(breaker1).toBeDefined();
    expect(breaker2).toBeDefined();
    expect(breaker1).not.toBe(breaker2);
  });

  it('should return same instance for same key', () => {
    const breaker1 = manager.getCircuitBreaker('agent1');
    const breaker2 = manager.getCircuitBreaker('agent1');

    expect(breaker1).toBe(breaker2);
  });

  it('should reset circuit breaker', async () => {
    const breaker = manager.getCircuitBreaker('test-agent', {
      failureThreshold: 2
    });

    // Force to OPEN
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(
          async () => {
            throw new Error('Test failure');
          },
          async () => ({ fallback: true })
        );
      } catch (error) {
        // Expected to fail
      }
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Reset
    manager.resetCircuitBreaker('test-agent');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });
});

