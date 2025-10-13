'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function RealtimeStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    // Check initial connection
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        
        if (error) throw error;
        setIsConnected(true);
        setIsConnecting(false);
      } catch (error) {
        setIsConnected(false);
        setIsConnecting(false);
      }
    };

    checkConnection();

    // Subscribe to connection status changes
    const channel = supabase
      .channel('connection-status')
      .on('system', {}, (status) => {
        if (status.status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status.status === 'CHANNEL_ERROR' || status.status === 'TIMED_OUT') {
          setIsConnected(false);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isConnecting) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
        Bağlanıyor...
      </Badge>
    );
  }

  return (
    <Badge 
      variant={isConnected ? "default" : "destructive"} 
      className="flex items-center gap-1"
    >
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3" />
          Canlı
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          Bağlantı Kesildi
        </>
      )}
    </Badge>
  );
}

