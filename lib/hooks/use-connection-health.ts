'use client';

import { useEffect, useState, useCallback } from 'react';

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
      // Sunucuya erişilebilirlik: kendi API'miz (DB'ye gitmez, 204/401 döner).
      // Önceden tarayıcıdan PostgREST'e (/rest/v1) gidiliyordu; self-hosted kurulumda bu yol
      // dışarı kapalı olduğundan hep 404 alınıyor ve ~90 sn sonra realtime polling'e düşüyordu.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      let response: Response;
      try {
        response = await fetch('/api/auth/verify', { cache: 'no-store', signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }

      const latency = Date.now() - startTime;

      // 2xx / 4xx: sunucu ayakta (401 = oturum düşmüş ama bağlantı sağlam). 5xx: proxy/uygulama sorunu.
      if (response.status >= 500) {
        return {
          isHealthy: false,
          latency,
          error: `HTTP ${response.status}`,
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
