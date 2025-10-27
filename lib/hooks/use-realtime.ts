'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

export const useRealtime = (
  table: string,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void
) => {
  const [isClient, setIsClient] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;
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
        logger.log(`🔔 Setting up real-time subscription for table: ${table}`);

               channel = supabase
                 .channel(`${table}-changes-${Date.now()}`, {
                   config: {
                     broadcast: { self: false },
                     presence: { key: '' },
                     realtime: {
                       heartbeat_interval_ms: 30000,
                       reconnect_after_ms: [1000, 2000, 5000, 10000, 30000],
                       events_per_second: 5
                     }
                   }
                 })
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: table
          }, (payload) => {
            logger.log('🔔 Real-time INSERT:', payload);
            onInsert?.(payload.new);
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: table
          }, (payload) => {
            logger.log('🔔 Real-time UPDATE:', payload);
            onUpdate?.(payload.new);
          })
          .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: table
          }, (payload) => {
            logger.log('🔔 Real-time DELETE:', payload);
            onDelete?.(payload.old);
          })
          .subscribe((status, err) => {
            logger.log(`🔔 Real-time subscription status: ${status}`);
            
            if (err) {
              logger.error('🔔 Real-time subscription error:', err);
            }
            
            if (status === 'SUBSCRIBED') {
              reconnectAttemptsRef.current = 0;
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              logger.warn(`🔔 Real-time connection lost for table: ${table}, status: ${status}`);
              
              if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++;
                logger.log(`🔔 Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
                
                reconnectTimeoutRef.current = setTimeout(() => {
                  if (channel) {
                    supabase.removeChannel(channel);
                  }
                  setupRealtime();
                }, Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000));
              } else {
                logger.error('🔔 Max reconnection attempts reached, giving up');
              }
            }
          });
      } catch (error) {
        logger.error('🔔 Error setting up real-time subscription:', error);
      }
    };

    setupRealtime();

    return () => {
      logger.log(`🔔 Cleaning up real-time subscription for table: ${table}`);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isClient, table, onInsert, onUpdate, onDelete]);
};

