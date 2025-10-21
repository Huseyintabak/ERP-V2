'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRealtimeManager } from './use-realtime-manager';

interface RealtimeFallbackConfig {
  maxErrors?: number;
  errorWindow?: number; // Time window in milliseconds
  fallbackInterval?: number; // Polling interval when realtime fails
}

export const useRealtimeFallback = (
  table: string,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void,
  fallbackFetch?: () => Promise<void>,
  config: RealtimeFallbackConfig = {}
) => {
  const {
    maxErrors = 3,
    errorWindow = 60000, // 1 minute
    fallbackInterval = 30000 // 30 seconds
  } = config;

  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState<number>(0);
  const [fallbackIntervalId, setFallbackIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Track errors and disable realtime if too many errors occur
  const handleError = useCallback((error: string) => {
    const now = Date.now();
    setLastErrorTime(now);
    
    // Reset error count if outside error window
    if (now - lastErrorTime > errorWindow) {
      setErrorCount(1);
    } else {
      setErrorCount(prev => prev + 1);
    }

    // Disable realtime if too many errors
    if (errorCount >= maxErrors) {
      console.warn(`🔔 Too many realtime errors for ${table}, switching to fallback mode`);
      setIsRealtimeEnabled(false);
      
      // Start fallback polling
      if (fallbackFetch && !fallbackIntervalId) {
        const interval = setInterval(() => {
          console.log(`🔔 Fallback polling for ${table}`);
          fallbackFetch();
        }, fallbackInterval);
        setFallbackIntervalId(interval);
      }
    }
  }, [errorCount, lastErrorTime, errorWindow, maxErrors, table, fallbackFetch, fallbackInterval, fallbackIntervalId]);

  // Use realtime manager when enabled
  const { isConnected, error } = useRealtimeManager(
    table,
    isRealtimeEnabled ? onInsert : undefined,
    isRealtimeEnabled ? onUpdate : undefined,
    isRealtimeEnabled ? onDelete : undefined
  );

  // Handle realtime errors
  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error, handleError]);

  // Cleanup fallback interval
  useEffect(() => {
    return () => {
      if (fallbackIntervalId) {
        clearInterval(fallbackIntervalId);
      }
    };
  }, [fallbackIntervalId]);

  // Manual retry function
  const retryRealtime = useCallback(() => {
    console.log(`🔔 Retrying realtime for ${table}`);
    setErrorCount(0);
    setIsRealtimeEnabled(true);
    
    if (fallbackIntervalId) {
      clearInterval(fallbackIntervalId);
      setFallbackIntervalId(null);
    }
  }, [table, fallbackIntervalId]);

  return {
    isConnected: isRealtimeEnabled ? isConnected : false,
    isRealtimeEnabled,
    error,
    errorCount,
    retryRealtime,
    isUsingFallback: !isRealtimeEnabled
  };
};
