'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface PollingConfig {
  interval?: number; // Polling interval in milliseconds (default: 5000 - 5 seconds)
  enabled?: boolean; // Enable/disable polling (default: true)
  onError?: (error: Error) => void; // Error callback
}

/**
 * Simple polling hook - fetches data at regular intervals
 * Much more reliable than WebSocket for unstable connections
 */
export const usePolling = (
  fetchFunction: () => Promise<void>,
  config: PollingConfig = {}
) => {
  const {
    interval = 5000, // Default 5 seconds
    enabled = true,
    onError
  } = config;

  const [isActive, setIsActive] = useState(enabled);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const poll = useCallback(async () => {
    if (!isMountedRef.current || !isActive) return;

    try {
      await fetchFunction();
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Polling error');
      setError(error);
      onError?.(error);
      console.error('Polling error:', error);
    }
  }, [fetchFunction, isActive, onError]);

  // Start polling
  const startPolling = useCallback(() => {
    console.log('📊 Starting polling...');
    setIsActive(true);
    
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Immediate fetch
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, interval);
  }, [poll, interval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    console.log('📊 Stopping polling...');
    setIsActive(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Manual refresh
  const refresh = useCallback(async () => {
    console.log('📊 Manual refresh...');
    await poll();
  }, [poll]);

  // Auto-start polling on mount
  useEffect(() => {
    if (enabled) {
      startPolling();
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, startPolling]);

  return {
    isActive,
    lastUpdate,
    error,
    startPolling,
    stopPolling,
    refresh
  };
};

