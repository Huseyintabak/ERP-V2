'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Wait for user to be loaded by layout
    if (!user) {
      return;
    }

    // Role-based redirect to specific dashboard
    switch (user.role) {
      case 'yonetici':
        router.push('/yonetici-dashboard');
        break;
      case 'planlama':
        router.push('/planlama-dashboard');
        break;
      case 'depo':
        router.push('/depo-dashboard');
        break;
      case 'operator':
        router.push('/operator-dashboard');
        break;
      default:
        router.push('/yonetici-dashboard'); // Default to admin dashboard
    }
  }, [user, router]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Dashboard yükleniyor...</p>
      </div>
    </div>
  );
}
