'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ArrowLeftRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Ana Sayfa',
    href: '/depo/mobile-dashboard',
    icon: Home,
  },
  {
    label: 'Transfer',
    href: '/depo/zone-transfer',
    icon: ArrowLeftRight,
  },
  {
    label: 'Ürün Ara',
    href: '/depo/urun-ara',
    icon: Search,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg safe-area-inset-bottom">
      <div className="grid grid-cols-3 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-all duration-200',
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 active:scale-95'
              )}
            >
              <div
                className={cn(
                  'relative flex items-center justify-center',
                  isActive && 'animate-bounce-subtle'
                )}
              >
                <Icon
                  className={cn(
                    'transition-all duration-200',
                    isActive ? 'h-6 w-6' : 'h-5 w-5'
                  )}
                />
                {isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium transition-all duration-200',
                  isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
