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
          // Cookie yok, ama login'den geliyorsak biraz bekle (cookie henüz yazılmamış olabilir)
          if (retryCount < 3) {
            setTimeout(() => {
              checkAuth(retryCount + 1);
            }, 200 * (retryCount + 1)); // Increasing delay: 200ms, 400ms, 600ms
            return;
          }
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
          // If 401, retry with longer delay (cookie might not be ready yet)
          if (response?.status === 401 && retryCount < 3) {
            setTimeout(() => {
              checkAuth(retryCount + 1);
            }, 200 * (retryCount + 1)); // Increasing delay: 200ms, 400ms, 600ms
            return;
          }
          router.push('/login');
          return;
        }
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        // Retry on network error
        if (retryCount < 3) {
          setTimeout(() => {
            checkAuth(retryCount + 1);
          }, 200 * (retryCount + 1));
          return;
        }
        router.push('/login');
      }
    };

    if (!user) {
      // Initial delay to allow cookie to be set after redirect from login
      setTimeout(() => {
        checkAuth();
      }, 100);
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


