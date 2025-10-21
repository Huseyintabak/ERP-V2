'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export function RealtimeStatus() {
  const [isConnected, setIsConnected] = useState(true); // Default to connected
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Simple connection check without creating realtime subscriptions
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/test-notifications');
        if (response.ok) {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        setIsConnected(false);
      }
    };

    // Check connection on mount
    checkConnection();

    // Check connection periodically (every 30 seconds)
    const interval = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

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

