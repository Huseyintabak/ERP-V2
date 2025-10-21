'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useConnectionHealth } from './use-connection-health';

interface RealtimeConfig {
  maxRetries?: number;
  retryDelay?: number;
  heartbeatInterval?: number;
  reconnectAfter?: number[];
  eventsPerSecond?: number;
  enableFallback?: boolean;
  fallbackInterval?: number;
}

interface RealtimeState {
  isConnected: boolean;
  isRealtimeEnabled: boolean;
  isUsingFallback: boolean;
  error: string | null;
  retryCount: number;
  lastError: number;
}

export const useRealtimeUnified = (
  table: string,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void,
  fallbackFetch?: () => Promise<void>,
  config: RealtimeConfig = {}
) => {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    heartbeatInterval = 30000,
    reconnectAfter = [2000, 5000, 10000, 20000, 30000],
    eventsPerSecond = 1,
    enableFallback = true,
    fallbackInterval = 30000
  } = config;

  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isRealtimeEnabled: true,
    isUsingFallback: false,
    error: null,
    retryCount: 0,
    lastError: 0
  });

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<any>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDestroyedRef = useRef(false);

  // Connection health monitoring
  const { isHealthy, latency, consecutiveFailures, forceCheck } = useConnectionHealth(
    30000, // Check every 30 seconds
    3 // Max consecutive failures
  );

  // Reset connection completely
  const resetConnection = useCallback(() => {
    console.log(`🔔 Resetting connection for ${table}`);
    
    // Clear existing channel
    if (channelRef.current) {
      try {
        supabaseRef.current.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('Error removing channel:', error);
      }
      channelRef.current = null;
    }

    // Clear fallback interval
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }

    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Create new Supabase client to avoid stale connections
    supabaseRef.current = createClient();
  }, [table]);

  // Start fallback polling
  const startFallback = useCallback(() => {
    if (!enableFallback || !fallbackFetch || fallbackIntervalRef.current) return;

    console.log(`🔔 Starting fallback polling for ${table}`);
    setState(prev => ({ ...prev, isUsingFallback: true, isRealtimeEnabled: false }));

    fallbackIntervalRef.current = setInterval(() => {
      if (!isDestroyedRef.current && fallbackFetch) {
        fallbackFetch().catch(error => {
          console.error(`Fallback fetch error for ${table}:`, error);
        });
      }
    }, fallbackInterval);
  }, [table, enableFallback, fallbackFetch, fallbackInterval]);

  // Stop fallback polling
  const stopFallback = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    setState(prev => ({ ...prev, isUsingFallback: false }));
  }, []);

  // Handle connection errors
  const handleError = useCallback((error: string) => {
    const now = Date.now();
    console.error(`🔔 Realtime error for ${table}:`, error);

    setState(prev => ({
      ...prev,
      error,
      lastError: now,
      retryCount: prev.retryCount + 1,
      isConnected: false
    }));

    // If too many errors, switch to fallback
    if (state.retryCount >= maxRetries) {
      console.warn(`🔔 Max retries reached for ${table}, switching to fallback`);
      startFallback();
      return;
    }

    // Schedule retry
    const delay = Math.min(retryDelay * Math.pow(2, state.retryCount), 30000);
    retryTimeoutRef.current = setTimeout(() => {
      if (!isDestroyedRef.current) {
        console.log(`🔔 Retrying connection for ${table} (attempt ${state.retryCount + 1})`);
        resetConnection();
        setupRealtime();
      }
    }, delay);
  }, [table, state.retryCount, maxRetries, retryDelay, startFallback, resetConnection]);

  // Setup realtime connection
  const setupRealtime = useCallback(async () => {
    if (isDestroyedRef.current || !state.isRealtimeEnabled || !isHealthy) return;

    try {
      // Reset connection first
      resetConnection();

      // Add a small delay to prevent rapid connection attempts
      await new Promise(resolve => setTimeout(resolve, 1000));

      const channelName = `${table}-unified-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🔔 Setting up unified realtime for ${table} (${channelName})`);

      const channel = supabaseRef.current
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
            realtime: {
              heartbeat_interval_ms: heartbeatInterval,
              reconnect_after_ms: reconnectAfter,
              events_per_second: eventsPerSecond
            }
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: table
        }, (payload) => {
          if (!isDestroyedRef.current) {
            console.log(`🔔 Unified INSERT for ${table}:`, payload);
            onInsert?.(payload.new);
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: table
        }, (payload) => {
          if (!isDestroyedRef.current) {
            console.log(`🔔 Unified UPDATE for ${table}:`, payload);
            onUpdate?.(payload.new);
          }
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: table
        }, (payload) => {
          if (!isDestroyedRef.current) {
            console.log(`🔔 Unified DELETE for ${table}:`, payload);
            onDelete?.(payload.old);
          }
        })
        .subscribe((status, err) => {
          if (isDestroyedRef.current) return;

          console.log(`🔔 Unified subscription status for ${table}: ${status}`, err ? `Error: ${err.message}` : '');

          if (err) {
            // Handle specific WebSocket errors
            if (err.message?.includes('WebSocket is closed before the connection is established')) {
              console.log(`🔔 WebSocket closed early for ${table}, retrying...`);
              setTimeout(() => {
                if (!isDestroyedRef.current) {
                  setupRealtime();
                }
              }, 2000);
              return;
            }
            handleError(err.message || 'Unknown subscription error');
            return;
          }

          if (status === 'SUBSCRIBED') {
            setState(prev => ({
              ...prev,
              isConnected: true,
              error: null,
              retryCount: 0
            }));
            stopFallback();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            handleError(`Subscription ${status.toLowerCase()}`);
          } else if (status === 'CLOSED') {
            console.log(`🔔 Connection closed for ${table}, will retry...`);
            setState(prev => ({
              ...prev,
              isConnected: false,
              error: 'Connection closed'
            }));
            // Auto-retry on close
            setTimeout(() => {
              if (!isDestroyedRef.current && !state.isUsingFallback) {
                setupRealtime();
              }
            }, 3000);
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error(`🔔 Error setting up realtime for ${table}:`, error);
      handleError(error instanceof Error ? error.message : 'Setup error');
    }
  }, [
    table,
    state.isRealtimeEnabled,
    onInsert,
    onUpdate,
    onDelete,
    heartbeatInterval,
    reconnectAfter,
    eventsPerSecond,
    handleError,
    resetConnection,
    stopFallback,
    isHealthy
  ]);

  // Manual retry function
  const retryRealtime = useCallback(() => {
    console.log(`🔔 Manual retry requested for ${table}`);
    setState(prev => ({
      ...prev,
      retryCount: 0,
      isRealtimeEnabled: true,
      error: null
    }));
    stopFallback();
    resetConnection();
    setupRealtime();
  }, [table, stopFallback, resetConnection, setupRealtime]);

  // Initialize connection
  useEffect(() => {
    if (state.isRealtimeEnabled && isHealthy) {
      setupRealtime();
    } else if (!isHealthy && state.isRealtimeEnabled) {
      console.log(`🔔 Connection unhealthy for ${table}, switching to fallback`);
      startFallback();
    }

    return () => {
      isDestroyedRef.current = true;
      resetConnection();
    };
  }, [state.isRealtimeEnabled, isHealthy, setupRealtime, resetConnection, startFallback, table]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDestroyedRef.current = true;
      resetConnection();
    };
  }, [resetConnection]);

  return {
    isConnected: state.isConnected,
    isRealtimeEnabled: state.isRealtimeEnabled,
    isUsingFallback: state.isUsingFallback,
    error: state.error,
    retryCount: state.retryCount,
    retryRealtime,
    // Health check info
    isHealthy,
    latency,
    consecutiveFailures,
    forceHealthCheck: forceCheck
  };
};
