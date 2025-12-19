'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();

  useEffect(() => {
    // Auth check - fetch user data (cookie httpOnly olduğu için JavaScript'ten okunamaz)
    const checkAuth = async (retryCount = 0) => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        }).catch(() => null); // Silently handle network errors
        
        if (!response || !response.ok) {
          // If 401, retry with delay (cookie might not be ready yet after login redirect)
          if (response?.status === 401 && retryCount < 3) {
            setTimeout(() => {
              checkAuth(retryCount + 1);
            }, 300 * (retryCount + 1)); // Increasing delay: 300ms, 600ms, 900ms
            return;
          }
          router.push('/operator-login');
          return;
        }
        const userData = await response.json();
        
        if (userData.role !== 'operator') {
          router.push('/403');
          return;
        }
        
        setUser(userData);
      } catch (error) {
        // Retry on network error
        if (retryCount < 3) {
          setTimeout(() => {
            checkAuth(retryCount + 1);
          }, 300 * (retryCount + 1));
          return;
        }
        router.push('/operator-login');
      }
    };

    if (!user) {
      // Initial delay to allow cookie to be set after redirect from login
      setTimeout(() => {
        checkAuth();
      }, 200);
    }
  }, [user, setUser, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    window.location.href = '/operator-login';
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Logout Button - Fixed Top Right */}
      <div className="fixed right-6 top-4 z-50">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Çıkış
        </Button>
      </div>

      {children}
    </div>
  );
}

