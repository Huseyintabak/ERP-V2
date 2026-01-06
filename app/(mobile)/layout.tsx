import type { Metadata, Viewport } from 'next';
import { BottomNav } from '@/components/mobile/bottom-nav';

export const metadata: Metadata = {
  title: 'Depo Yönetim - Mobil',
  description: 'Mobil Depo Yönetim ve Barkod Okuyucu',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Depo',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {children}
      <BottomNav />
    </div>
  );
}
