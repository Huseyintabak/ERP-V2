'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export const useRealtimeSafe = (
  table: string,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void
) => {
  const [isClient, setIsClient] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 3;
  const reconnectAttemptsRef = useRef(0);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run on client side
    if (!isClient) return;

    const supabase = createClient();
    let channel: any = null;

    const setupRealtime = () => {
      try {
        console.log(`🔔 Setting up safe real-time subscription for table: ${table}`);

        channel = supabase
          .channel(`${table}-safe-${Date.now()}`, {
            config: {
              broadcast: { self: false },
              presence: { key: '' },
              realtime: {
                heartbeat_interval_ms: 30000,
                reconnect_after_ms: [2000, 5000, 10000],
                events_per_second: 3
              }
            }
          })
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: table
          }, (payload) => {
            console.log('🔔 Safe real-time INSERT:', payload);
            onInsert?.(payload.new);
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: table
          }, (payload) => {
            console.log('🔔 Safe real-time UPDATE:', payload);
            onUpdate?.(payload.new);
          })
          .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: table
          }, (payload) => {
            console.log('🔔 Safe real-time DELETE:', payload);
            onDelete?.(payload.old);
          })
          .subscribe((status, err) => {
            console.log(`🔔 Safe real-time subscription status: ${status}`);

            if (err) {
              console.error('🔔 Safe real-time subscription error:', err);
            }

            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              reconnectAttemptsRef.current = 0;
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              console.warn(`🔔 Safe real-time connection lost for table: ${table}, status: ${status}`);
              setIsConnected(false);

              if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++;
                console.log(`🔔 Attempting safe reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);

                reconnectTimeoutRef.current = setTimeout(() => {
                  if (channel) {
                    supabase.removeChannel(channel);
                  }
                  setupRealtime();
                }, Math.min(2000 * reconnectAttemptsRef.current, 10000));
              } else {
                console.error('🔔 Max safe reconnection attempts reached, giving up');
              }
            }
          });
      } catch (error) {
        console.error('🔔 Error setting up safe real-time subscription:', error);
        setIsConnected(false);
      }
    };

    setupRealtime();

    return () => {
      console.log(`🔔 Cleaning up safe real-time subscription for table: ${table}`);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (channel) {
        supabase.removeChannel(channel);
      }
      
      setIsConnected(false);
    };
  }, [isClient, table, onInsert, onUpdate, onDelete]);

  return { isConnected };
};
