'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

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

    // Check if user is authenticated before attempting Realtime connection
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          // Sessizce handle et - 401 beklenen bir durum (kullanıcı giriş yapmamış)
          credentials: 'include',
        }).catch(() => null); // Network hatalarını sessizce handle et
        
        if (!response || !response.ok || response.status === 401) {
          // User not authenticated, skip Realtime connection (sessizce)
          setIsConnected(false);
          return false;
        }
        return true;
      } catch (error) {
        // Auth check failed, skip Realtime connection (sessizce)
        setIsConnected(false);
        return false;
      }
    };

    const setupRealtime = async () => {
      // Check authentication first
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        return;
      }

      try {
        logger.log(`🔔 Setting up safe real-time subscription for table: ${table}`);

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
            logger.log('🔔 Safe real-time INSERT:', payload);
            onInsert?.(payload.new);
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: table
          }, (payload) => {
            logger.log('🔔 Safe real-time UPDATE:', payload);
            onUpdate?.(payload.new);
          })
          .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: table
          }, (payload) => {
            logger.log('🔔 Safe real-time DELETE:', payload);
            onDelete?.(payload.old);
          })
          .subscribe((status, err) => {
            logger.log(`🔔 Safe real-time subscription status: ${status}`);

            if (err) {
              logger.error('🔔 Safe real-time subscription error:', err);
            }

            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              reconnectAttemptsRef.current = 0;
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              logger.warn(`🔔 Safe real-time connection lost for table: ${table}, status: ${status}`);
              setIsConnected(false);

              if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++;
                logger.log(`🔔 Attempting safe reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);

                reconnectTimeoutRef.current = setTimeout(() => {
                  if (channel) {
                    supabase.removeChannel(channel);
                    channel = null;
                  }
                  setupRealtime().catch((error) => {
                    logger.error('🔔 Error in setupRealtime retry:', error);
                    setIsConnected(false);
                  });
                }, Math.min(2000 * reconnectAttemptsRef.current, 10000));
              } else {
                logger.error('🔔 Max safe reconnection attempts reached, giving up');
              }
            }
          });
      } catch (error) {
        logger.error('🔔 Error setting up safe real-time subscription:', error);
        setIsConnected(false);
      }
    };

    setupRealtime().catch((error) => {
      logger.error('🔔 Error in setupRealtime:', error);
      setIsConnected(false);
    });

    return () => {
      logger.log(`🔔 Cleaning up safe real-time subscription for table: ${table}`);

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
