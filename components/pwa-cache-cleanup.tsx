'use client';

import { useEffect } from 'react';
import { clearLegacyCaches } from '@/lib/utils/pwa-cache';

/** Eski service worker kuralının API cevaplarını tuttuğu önbelleği açılışta siler */
export function PwaCacheCleanup() {
  useEffect(() => {
    void clearLegacyCaches();
  }, []);
  return null;
}
