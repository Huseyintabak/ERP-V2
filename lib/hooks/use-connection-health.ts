'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface HealthCheckResult {
  isHealthy: boolean;
  latency: number;
  error?: string;
  timestamp: number;
}

interface ConnectionHealthState {
  isHealthy: boolean;
  lastCheck: number;
  latency: number;
  consecutiveFailures: number;
  error?: string;
}

export const useConnectionHealth = (
  checkInterval: number = 30000, // 30 seconds
  maxConsecutiveFailures: number = 3
) => {
  const [state, setState] = useState<ConnectionHealthState>({
    isHealthy: true,
    lastCheck: 0,
    latency: 0,
    consecutiveFailures: 0
  });

  const performHealthCheck = useCallback(async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    
    try {
      const supabase = createClient();
      
      // Simple query to test connection
      const { data, error } = await supabase
        .from('production_plans')
        .select('id')
        .limit(1);
      
      const latency = Date.now() - startTime;
      
      if (error) {
        return {
          isHealthy: false,
          latency,
          error: error.message,
          timestamp: Date.now()
        };
      }
      
      return {
        isHealthy: true,
        latency,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        isHealthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }, []);

  const checkHealth = useCallback(async () => {
    const result = await performHealthCheck();
    
    setState(prev => {
      const newConsecutiveFailures = result.isHealthy ? 0 : prev.consecutiveFailures + 1;
      const isHealthy = newConsecutiveFailures < maxConsecutiveFailures;
      
      return {
        isHealthy,
        lastCheck: result.timestamp,
        latency: result.latency,
        consecutiveFailures: newConsecutiveFailures,
        error: result.error
      };
    });
  }, [performHealthCheck, maxConsecutiveFailures]);

  // Initial health check
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Periodic health checks
  useEffect(() => {
    const interval = setInterval(checkHealth, checkInterval);
    return () => clearInterval(interval);
  }, [checkHealth, checkInterval]);

  // Force health check
  const forceCheck = useCallback(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    ...state,
    forceCheck,
    performHealthCheck
  };
};
