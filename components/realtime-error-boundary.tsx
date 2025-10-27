'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class RealtimeErrorBoundary extends Component<Props, State> {
  private retryTimeout?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logger.error('🔔 Realtime Error Boundary caught an error:', error, errorInfo);
    
    // WebSocket connection errors are usually recoverable
    if (error.message.includes('WebSocket') || error.message.includes('realtime')) {
      logger.log('🔔 WebSocket error detected, will attempt recovery');
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleAutoRetry = () => {
    if (this.state.retryCount < 3) {
      this.retryTimeout = setTimeout(() => {
        this.handleRetry();
      }, Math.min(1000 * Math.pow(2, this.state.retryCount), 10000));
    }
  };

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      this.handleAutoRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              Realtime Bağlantı Hatası
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-orange-600">
              Canlı veri güncellemeleri geçici olarak kesintiye uğradı. 
              Bu durum genellikle ağ bağlantısı veya sunucu yükü nedeniyle oluşur.
            </p>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={this.handleRetry}
                size="sm"
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Yeniden Dene
              </Button>
              
              {this.state.retryCount > 0 && (
                <span className="text-xs text-orange-500">
                  Deneme: {this.state.retryCount}/3
                </span>
              )}
            </div>

            {this.state.retryCount >= 3 && (
              <p className="text-xs text-orange-500">
                Otomatik yeniden bağlanma başarısız oldu. Lütfen sayfayı yenileyin.
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
