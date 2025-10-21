'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity
} from 'lucide-react';

interface ConnectionStatus {
  table: string;
  isConnected: boolean;
  isRealtimeEnabled: boolean;
  isUsingFallback: boolean;
  error: string | null;
  retryCount: number;
  retryRealtime: () => void;
}

interface RealtimeConnectionMonitorProps {
  connections: ConnectionStatus[];
  className?: string;
}

export function RealtimeConnectionMonitor({ 
  connections, 
  className = '' 
}: RealtimeConnectionMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    setLastUpdate(Date.now());
  }, [connections]);

  const allConnected = connections.every(conn => conn.isConnected);
  const anyUsingFallback = connections.some(conn => conn.isUsingFallback);
  const anyErrors = connections.some(conn => conn.error);

  const getStatusIcon = () => {
    if (anyErrors) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (anyUsingFallback) return <Clock className="h-4 w-4 text-yellow-500" />;
    if (allConnected) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <WifiOff className="h-4 w-4 text-gray-500" />;
  };

  const getStatusText = () => {
    if (anyErrors) return 'Hata';
    if (anyUsingFallback) return 'Fallback';
    if (allConnected) return 'Bağlı';
    return 'Bağlantı Yok';
  };

  const getStatusColor = () => {
    if (anyErrors) return 'bg-red-100 text-red-700 border-red-200';
    if (anyUsingFallback) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (allConnected) return 'bg-green-100 text-green-700 border-green-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const retryAllConnections = () => {
    connections.forEach(conn => {
      if (conn.retryRealtime) {
        conn.retryRealtime();
      }
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Compact Status Bar */}
      <div 
        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors hover:bg-opacity-80 ${getStatusColor()}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">
            Realtime: {getStatusText()}
          </span>
          {connections.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {connections.filter(c => c.isConnected).length}/{connections.length}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {anyErrors && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                retryAllConnections();
              }}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Yeniden Dene
            </Button>
          )}
          <Activity className="h-4 w-4" />
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Bağlantı Detayları</span>
              <Button
                size="sm"
                variant="outline"
                onClick={retryAllConnections}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Tümünü Yenile
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connections.map((conn, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    conn.isConnected ? 'bg-green-500' : 
                    conn.isUsingFallback ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium">{conn.table}</span>
                  {conn.isUsingFallback && (
                    <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700">
                      Fallback
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {conn.error && (
                    <span className="text-xs text-red-600 max-w-32 truncate" title={conn.error}>
                      {conn.error}
                    </span>
                  )}
                  {conn.retryCount > 0 && (
                    <span className="text-xs text-gray-500">
                      {conn.retryCount} deneme
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={conn.retryRealtime}
                    className="text-xs h-6 px-2"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="text-xs text-gray-500 pt-2 border-t">
              Son güncelleme: {new Date(lastUpdate).toLocaleTimeString('tr-TR')}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
