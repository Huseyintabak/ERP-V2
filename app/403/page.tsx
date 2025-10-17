'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function ForbiddenPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-20 w-20 text-red-500" />
          </div>
          <CardTitle className="text-3xl font-bold text-red-600">
            403 - Erişim Reddedildi
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Bu sayfaya erişim yetkiniz yok
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Rolünüze göre bu sayfayı görüntüleme izniniz bulunmamaktadır.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link href="/dashboard">
                Ana Sayfaya Dön
              </Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Çıkış Yap
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


