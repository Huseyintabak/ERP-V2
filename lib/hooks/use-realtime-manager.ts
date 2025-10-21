'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface RealtimeSubscription {
  table: string;
  channel: any;
  subscribers: Set<string>;
  isConnected: boolean;
  lastActivity: number;
}

class RealtimeManager {
  private static instance: RealtimeManager;
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private supabase = createClient();
  private cleanupInterval: NodeJS.Timeout | null = null;

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  private constructor() {
    // Clean up inactive subscriptions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSubscriptions();
    }, 5 * 60 * 1000);
  }

  private cleanupInactiveSubscriptions() {
    const now = Date.now();
    const inactiveThreshold = 10 * 60 * 1000; // 10 minutes

    for (const [table, subscription] of this.subscriptions.entries()) {
      if (subscription.subscribers.size === 0 || 
          (now - subscription.lastActivity > inactiveThreshold)) {
        console.log(`🔔 Cleaning up inactive subscription for table: ${table}`);
        this.removeSubscription(table);
      }
    }
  }

  subscribe(
    table: string,
    subscriberId: string,
    onInsert?: (payload: any) => void,
    onUpdate?: (payload: any) => void,
    onDelete?: (payload: any) => void
  ): { isConnected: boolean; error: string | null } {
    let subscription = this.subscriptions.get(table);

    if (!subscription) {
      // Create new subscription
      subscription = this.createSubscription(table, onInsert, onUpdate, onDelete);
      this.subscriptions.set(table, subscription);
    }

    // Add subscriber
    subscription.subscribers.add(subscriberId);
    subscription.lastActivity = Date.now();

    return {
      isConnected: subscription.isConnected,
      error: null
    };
  }

  unsubscribe(table: string, subscriberId: string) {
    const subscription = this.subscriptions.get(table);
    if (!subscription) return;

    subscription.subscribers.delete(subscriberId);
    subscription.lastActivity = Date.now();

    // If no more subscribers, remove the subscription
    if (subscription.subscribers.size === 0) {
      this.removeSubscription(table);
    }
  }

  private createSubscription(
    table: string,
    onInsert?: (payload: any) => void,
    onUpdate?: (payload: any) => void,
    onDelete?: (payload: any) => void
  ): RealtimeSubscription {
    const channelName = `${table}-managed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔔 Creating managed subscription for table: ${table} (${channelName})`);

    const channel = this.supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
          realtime: {
            heartbeat_interval_ms: 30000,
            reconnect_after_ms: [2000, 5000, 10000],
            events_per_second: 2
          }
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: table
      }, (payload) => {
        console.log('🔔 Managed real-time INSERT:', payload);
        onInsert?.(payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: table
      }, (payload) => {
        console.log('🔔 Managed real-time UPDATE:', payload);
        onUpdate?.(payload.new);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: table
      }, (payload) => {
        console.log('🔔 Managed real-time DELETE:', payload);
        onDelete?.(payload.old);
      })
      .subscribe((status, err) => {
        console.log(`🔔 Managed real-time subscription status for ${table}: ${status}`);

        if (err) {
          console.error('🔔 Managed real-time subscription error:', err);
          return;
        }

        const subscription = this.subscriptions.get(table);
        if (subscription) {
          subscription.isConnected = status === 'SUBSCRIBED';
          subscription.lastActivity = Date.now();
        }
      });

    return {
      table,
      channel,
      subscribers: new Set(),
      isConnected: false,
      lastActivity: Date.now()
    };
  }

  private removeSubscription(table: string) {
    const subscription = this.subscriptions.get(table);
    if (!subscription) return;

    console.log(`🔔 Removing managed subscription for table: ${table}`);
    
    try {
      this.supabase.removeChannel(subscription.channel);
    } catch (error) {
      console.warn('Error removing channel:', error);
    }
    
    this.subscriptions.delete(table);
  }

  getStatus(table: string): { isConnected: boolean; subscriberCount: number } {
    const subscription = this.subscriptions.get(table);
    if (!subscription) {
      return { isConnected: false, subscriberCount: 0 };
    }

    return {
      isConnected: subscription.isConnected,
      subscriberCount: subscription.subscribers.size
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const [table] of this.subscriptions.entries()) {
      this.removeSubscription(table);
    }
  }
}

export const useRealtimeManager = (
  table: string,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriberIdRef = useRef<string>();
  const managerRef = useRef<RealtimeManager>();

  // Generate unique subscriber ID
  useEffect(() => {
    subscriberIdRef.current = `subscriber-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    managerRef.current = RealtimeManager.getInstance();
  }, []);

  useEffect(() => {
    if (!subscriberIdRef.current || !managerRef.current) return;

    const manager = managerRef.current;
    const subscriberId = subscriberIdRef.current;

    try {
      const result = manager.subscribe(table, subscriberId, onInsert, onUpdate, onDelete);
      setIsConnected(result.isConnected);
      setError(result.error);
    } catch (err) {
      console.error('Error subscribing to realtime:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const status = manager.getStatus(table);
      setIsConnected(status.isConnected);
    }, 5000);

    return () => {
      clearInterval(statusInterval);
      if (subscriberId && manager) {
        manager.unsubscribe(table, subscriberId);
      }
    };
  }, [table, onInsert, onUpdate, onDelete]);

  return { isConnected, error };
};
