/**
 * PWA (service worker) önbellek temizliği.
 *
 * - LEGACY_CACHES: eski service worker'ın (next-pwa varsayılan kuralları) API cevaplarını
 *   ve kullanıcıya özel RSC/veri payload'larını tuttuğu önbellekler. Yeni SW bunları
 *   kullanmıyor ama cihazlarda kalmış olabilirler; her açılışta silinir.
 *   ("apis": /api/* NetworkFirst 24 saat — eski stok verisinin kaynağı)
 * - PER_USER_CACHES: sayfa kabukları; çıkışta silinir (ortak depo cihazlarında
 *   bir sonraki kullanıcı görmesin).
 */
const LEGACY_CACHES = [
  'apis',
  'offlineCache',
  'next-data',
  'pages-rsc',
  'pages-rsc-prefetch',
  'others',
  'cross-origin',
  'static-data-assets',
];
const PER_USER_CACHES = ['pages', 'start-url'];

async function deleteCaches(names: string[]): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  await Promise.all(names.map((name) => caches.delete(name).catch(() => false)));
}

export function clearLegacyCaches(): Promise<void> {
  return deleteCaches(LEGACY_CACHES);
}

/** Çıkışta çağır: kullanıcıya özel ve eski önbellekleri temizler */
export function clearPrivateCaches(): Promise<void> {
  return deleteCaches([...LEGACY_CACHES, ...PER_USER_CACHES]);
}
