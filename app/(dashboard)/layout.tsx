'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAllCriticalNotifications } from '@/lib/hooks/use-critical-notifications';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  
  // Enable critical notifications for all dashboard pages
  // Hook will check authentication internally
  useAllCriticalNotifications();

  useEffect(() => {
    // Auth check - middleware zaten cookie kontrolü yapıyor
    // Bu sadece user verilerini yüklemek için
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
        // 401 ise middleware zaten redirect yapacak, burada bir şey yapmaya gerek yok
      } catch {
        // Network error - middleware kontrolünü bekle
      }
    };

    if (!user) {
      fetchUser();
    }
  }, [user, setUser]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}


