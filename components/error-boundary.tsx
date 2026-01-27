'use client';

import React from 'react';
import { logger } from '@/lib/utils/logger';
import { createErrorResponse, ErrorCode } from '@/lib/utils/error-handler';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error
    logger.error('Error Boundary caught:', error, errorInfo);
    
    // Create error response for logging
    const errorResponse = createErrorResponse(error, window.location.pathname);
    logger.error('Error details:', errorResponse);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Store error info
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;
      const errorMessage = error?.message || 'Beklenmeyen bir hata oluştu.';
      const isDev = process.env.NODE_ENV === 'development';

      return (
        <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
          <Card className="max-w-2xl w-full border-red-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <CardTitle className="text-2xl font-bold text-red-600">
                  Bir Hata Oluştu
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-gray-800 font-medium">{errorMessage}</p>
              </div>

              {isDev && error && (
                <details className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                    Hata Detayları (Development)
                  </summary>
                  <pre className="text-xs text-gray-600 overflow-auto max-h-64">
                    {error.stack || error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-gray-600 overflow-auto max-h-64 mt-2">
                      {JSON.stringify(this.state.errorInfo.componentStack, null, 2)}
                    </pre>
                  )}
                </details>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tekrar Dene
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sayfayı Yenile
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Ana Sayfaya Dön
                </Button>
              </div>

              <div className="text-xs text-gray-500 mt-4">
                <p>Hata kodu: {ErrorCode.INTERNAL_ERROR}</p>
                <p>Zaman: {new Date().toLocaleString('tr-TR')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

