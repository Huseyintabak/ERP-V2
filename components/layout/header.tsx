'use client';

import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/notifications/notification-bell';
import { RealtimeStatus } from '@/components/ui/realtime-status';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex-1">
        {/* Breadcrumb buraya eklenebilir */}
      </div>

      <div className="flex items-center gap-4">
        {/* Real-time Status */}
        <RealtimeStatus />
        
        {/* Bildirimler */}
        <NotificationBell />
      </div>
    </header>
  );
}

