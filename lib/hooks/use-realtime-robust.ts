'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface RealtimeConfig {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  eventsPerSecond?: number;
}

interface RealtimeStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

export const useRealtimeRobust = (
  table: string,
  onEvent?: (payload: any) => void,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void,
  config: RealtimeConfig = {}
) => {
  const {
    maxReconnectAttempts = 3,
    reconnectDelay = 2000,
    heartbeatInterval = 30000,
    eventsPerSecond = 2
  } = config;

  const [status, setStatus] = useState<RealtimeStatus>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0
  });

  const [isClient, setIsClient] = useState(false);
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isActiveRef = useRef(true);
  const lastEventRef = useRef<number>(0);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
    return () => {
      isActiveRef.current = false;
    };
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    if (channelRef.current) {
      try {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('Error removing channel:', error);
      }
      channelRef.current = null;
    }
  }, []);

  const setupRealtime = useCallback(() => {
    if (!isClient || !isActiveRef.current) return;

    // Clean up existing connection
    cleanup();

    setStatus(prev => ({
      ...prev,
      isConnecting: true,
      error: null
    }));

    try {
      const supabase = createClient();
      const channelName = `${table}-robust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`🔔 Setting up robust real-time subscription for table: ${table} (${channelName})`);

      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
            realtime: {
              heartbeat_interval_ms: heartbeatInterval,
              reconnect_after_ms: [reconnectDelay, reconnectDelay * 2, reconnectDelay * 4],
              events_per_second: eventsPerSecond
            }
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: table
        }, (payload) => {
          if (!isActiveRef.current) return;
          
          const now = Date.now();
          if (now - lastEventRef.current < 100) {
            console.log('🔔 Throttling rapid INSERT events');
            return;
          }
          lastEventRef.current = now;
          
          console.log('🔔 Robust real-time INSERT:', payload);
          onEvent?.(payload.new);
          onInsert?.(payload.new);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: table
        }, (payload) => {
          if (!isActiveRef.current) return;
          
          const now = Date.now();
          if (now - lastEventRef.current < 100) {
            console.log('🔔 Throttling rapid UPDATE events');
            return;
          }
          lastEventRef.current = now;
          
          console.log('🔔 Robust real-time UPDATE:', payload);
          onEvent?.(payload.new);
          onUpdate?.(payload.new);
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: table
        }, (payload) => {
          if (!isActiveRef.current) return;
          
          const now = Date.now();
          if (now - lastEventRef.current < 100) {
            console.log('🔔 Throttling rapid DELETE events');
            return;
          }
          lastEventRef.current = now;
          
          console.log('🔔 Robust real-time DELETE:', payload);
          onEvent?.(payload.old);
          onDelete?.(payload.old);
        })
        .subscribe((subscriptionStatus, err) => {
          if (!isActiveRef.current) return;

          console.log(`🔔 Robust real-time subscription status for ${table}: ${subscriptionStatus}`);

          if (err) {
            console.error('🔔 Robust real-time subscription error:', err);
            setStatus(prev => ({
              ...prev,
              isConnecting: false,
              isConnected: false,
              error: err.message || 'Subscription error',
              reconnectAttempts: prev.reconnectAttempts + 1
            }));
            return;
          }

          if (subscriptionStatus === 'SUBSCRIBED') {
            console.log(`🔔 Successfully connected to ${table}`);
            setStatus(prev => ({
              ...prev,
              isConnected: true,
              isConnecting: false,
              error: null,
              reconnectAttempts: 0
            }));
            channelRef.current = channel;
          } else if (subscriptionStatus === 'CHANNEL_ERROR' || 
                     subscriptionStatus === 'TIMED_OUT' || 
                     subscriptionStatus === 'CLOSED') {
            
            console.warn(`🔔 Robust real-time connection lost for table: ${table}, status: ${subscriptionStatus}`);
            
            setStatus(prev => ({
              ...prev,
              isConnected: false,
              isConnecting: false,
              error: `Connection lost: ${subscriptionStatus}`,
              reconnectAttempts: prev.reconnectAttempts + 1
            }));

            // Attempt reconnection with exponential backoff
            if (status.reconnectAttempts < maxReconnectAttempts) {
              const delay = Math.min(reconnectDelay * Math.pow(2, status.reconnectAttempts), 30000);
              console.log(`🔔 Attempting robust reconnect (${status.reconnectAttempts + 1}/${maxReconnectAttempts}) in ${delay}ms...`);
              
              reconnectTimeoutRef.current = setTimeout(() => {
                if (isActiveRef.current) {
                  setupRealtime();
                }
              }, delay);
            } else {
              console.error('🔔 Max robust reconnection attempts reached, giving up');
              setStatus(prev => ({
                ...prev,
                error: 'Max reconnection attempts reached'
              }));
            }
          }
        });

    } catch (error) {
      console.error('🔔 Error setting up robust real-time subscription:', error);
      setStatus(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [isClient, table, onEvent, onInsert, onUpdate, onDelete, maxReconnectAttempts, reconnectDelay, heartbeatInterval, eventsPerSecond, status.reconnectAttempts]);

  useEffect(() => {
    if (!isClient) return;

    setupRealtime();

    return () => {
      console.log(`🔔 Cleaning up robust real-time subscription for table: ${table}`);
      isActiveRef.current = false;
      cleanup();
    };
  }, [isClient, setupRealtime]);

  return {
    isConnected: status.isConnected,
    isConnecting: status.isConnecting,
    error: status.error,
    reconnectAttempts: status.reconnectAttempts,
    reconnect: setupRealtime
  };
};
