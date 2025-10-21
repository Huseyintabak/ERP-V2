'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamic import with no SSR to prevent hydration mismatch
const OperatorDashboardClient = dynamic(
  () => import('@/components/operator/operator-dashboard-client'),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Operatör Paneli Yükleniyor...</p>
        </div>
      </div>
    )
  }
);

export default function OperatorDashboard() {
  return <OperatorDashboardClient />;
}