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
    // Auth check - first check cookie, then fetch user data if cookie exists
    const checkAuth = async (retryCount = 0) => {
      // First check cookie - if no cookie, redirect immediately
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        const hasToken = cookies.some(cookie => {
          const [name] = cookie.trim().split('=');
          return name === 'thunder_token';
        });
        
        if (!hasToken) {
          router.push('/login');
          return;
        }
      }

      // Cookie exists, fetch user data
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        }).catch(() => null); // Silently handle network errors
        
        if (!response || !response.ok) {
          // If 401 and we just logged in, retry once after a short delay
          if (response?.status === 401 && retryCount === 0) {
            setTimeout(() => {
              checkAuth(1);
            }, 100);
            return;
          }
          router.push('/login');
          return;
        }
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        // Retry once on network error
        if (retryCount === 0) {
          setTimeout(() => {
            checkAuth(1);
          }, 100);
          return;
        }
        router.push('/login');
      }
    };

    if (!user) {
      checkAuth();
    }
  }, [user, setUser, router]);

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


