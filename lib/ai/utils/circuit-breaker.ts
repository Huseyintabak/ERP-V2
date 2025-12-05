/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures in distributed agent systems
 */

export enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation - requests pass through
  OPEN = 'OPEN',          // Failing - requests blocked
  HALF_OPEN = 'HALF_OPEN' // Testing - limited requests allowed
}

export interface CircuitBreakerConfig {
  failureThreshold: number;        // Number of failures before opening (default: 5)
  successThreshold: number;        // Number of successes needed to close (default: 2)
  timeout: number;                 // Time in ms to wait before attempting half-open (default: 60000)
  monitoringPeriod: number;        // Time window for tracking failures (default: 60000)
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,        // 60 seconds
  monitoringPeriod: 60000 // 60 seconds
};

/**
 * Circuit Breaker Class
 * Manages state transitions and request handling
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private config: CircuitBreakerConfig;
  private failureTimestamps: Date[] = []; // Track failure timestamps for monitoring period

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit should transition to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptHalfOpen()) {
        this.state = CircuitState.HALF_OPEN;
        this.failures = 0;
        this.successes = 0;
      } else {
        // Circuit is open, use fallback or throw error
        // Don't record this as a failure since circuit is already open
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker is OPEN. Last failure: ${this.lastFailureTime}`);
      }
    }

    try {
      // Execute the function
      const result = await fn();
      
      // Success - update state
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure - update state FIRST (before fallback)
      this.onFailure();
      
      // Use fallback if available (after recording failure)
      if (fallback) {
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.successes++;
    this.lastSuccessTime = new Date();

    // If in HALF_OPEN state and enough successes, close the circuit
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in CLOSED state (only if we had failures)
      // This allows consecutive failures to accumulate
      this.failures = 0;
      this.failureTimestamps = [];
    }

    // Clean old failure timestamps
    this.cleanOldFailureTimestamps();
  }

  /**
   * Record a failed operation
   */
  private onFailure(): void {
    this.totalFailures++;
    this.failures++;
    this.lastFailureTime = new Date();
    this.failureTimestamps.push(new Date());

    // If in HALF_OPEN state, immediately open the circuit
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.successes = 0;
    } else if (this.state === CircuitState.CLOSED) {
      // Clean old failure timestamps AFTER incrementing failures
      this.cleanOldFailureTimestamps();
      
      // If consecutive failures reach threshold, open the circuit
      // Note: failures counter tracks consecutive failures (reset on success)
      // failuresInPeriod tracks failures within monitoring window
      const failuresInPeriod = this.getFailureCountInPeriod();
      if (this.failures >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.successes = 0;
      } else if (failuresInPeriod >= this.config.failureThreshold) {
        // Also check failures in monitoring period as backup
        this.state = CircuitState.OPEN;
        this.successes = 0;
      }
    }
  }

  /**
   * Check if circuit should transition to HALF_OPEN
   */
  private shouldAttemptHalfOpen(): boolean {
    if (!this.lastFailureTime) {
      return true;
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.timeout;
  }

  /**
   * Get failure count within monitoring period
   */
  private getFailureCountInPeriod(): number {
    const now = Date.now();
    const cutoff = now - this.config.monitoringPeriod;
    
    return this.failureTimestamps.filter(
      timestamp => timestamp.getTime() >= cutoff
    ).length;
  }

  /**
   * Clean old failure timestamps outside monitoring period
   */
  private cleanOldFailureTimestamps(): void {
    const now = Date.now();
    const cutoff = now - this.config.monitoringPeriod;
    
    this.failureTimestamps = this.failureTimestamps.filter(
      timestamp => timestamp.getTime() >= cutoff
    );
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Reset circuit breaker to CLOSED state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.failureTimestamps = [];
  }

  /**
   * Manually open the circuit
   */
  open(): void {
    this.state = CircuitState.OPEN;
    this.lastFailureTime = new Date();
  }

  /**
   * Manually close the circuit
   */
  close(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
    this.failureTimestamps = [];
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different agents/endpoints
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker for a specific key
   */
  getBreaker(key: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(key)) {
      this.breakers.set(key, new CircuitBreaker(config));
    }
    return this.breakers.get(key)!;
  }

  /**
   * Alias for getBreaker (for backward compatibility)
   */
  getCircuitBreaker(key: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    return this.getBreaker(key, config);
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, key) => {
      stats[key] = breaker.getStats();
    });
    return stats;
  }

  /**
   * Reset a specific circuit breaker
   */
  reset(key: string): void {
    this.breakers.get(key)?.reset();
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }

  /**
   * Reset a specific circuit breaker by key (alias)
   */
  resetCircuitBreaker(key: string): void {
    this.reset(key);
  }

  /**
   * Remove a circuit breaker
   */
  remove(key: string): void {
    this.breakers.delete(key);
  }
}

// Singleton instance for global use
let managerInstance: CircuitBreakerManager | null = null;

/**
 * Get the global circuit breaker manager instance
 */
export function getCircuitBreakerManager(): CircuitBreakerManager {
  if (!managerInstance) {
    managerInstance = new CircuitBreakerManager();
  }
  return managerInstance;
}

