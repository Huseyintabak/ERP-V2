'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-20 w-20 text-red-500" />
          </div>
          <CardTitle className="text-3xl font-bold text-red-600">
            Bir Hata Oluştu
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Beklenmeyen bir hata meydana geldi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-left">
            <p className="text-sm font-semibold text-red-800 mb-2">Hata Detayları:</p>
            <p className="text-xs text-red-700 font-mono break-all">
              {error.message || 'Bilinmeyen hata'}
            </p>
            {error.digest && (
              <p className="text-xs text-red-600 mt-2">
                Hata ID: {error.digest}
              </p>
            )}
          </div>
          
          <div className="flex gap-3 justify-center">
            <Button onClick={reset} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tekrar Dene
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Ana Sayfa
              </Link>
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            Sorun devam ederse, lütfen browser console'u (F12) kontrol edin ve hata detaylarını paylaşın.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

