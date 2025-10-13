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
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok || response.status === 401) {
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
        router.push('/operator-login');
      }
    };

    if (!user) {
      checkAuth();
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

