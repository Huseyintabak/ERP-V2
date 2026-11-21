import type { NextConfig } from "next";
import withPWA from '@ducanh2912/next-pwa';

const nextConfig: NextConfig = {
  // Lint hataları build'i durdurur (2026-11: tüm error seviyesi kurallar temizlendi)
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Tip hataları build'i durdurur (2026-11: 527 hata temizlendi; tekrar birikmesin)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Source map ayarları - production'da devre dışı
  productionBrowserSourceMaps: false,
  // Uygulama same-origin çalışır; CORS header'ı bilerek verilmez
  // (önceki "Allow-Origin: *" + credentials, her siteden API çağrısına izin veriyordu)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      // Cache-busting headers for JavaScript and CSS files
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:all*(svg|jpg|png|ico|webp)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ];
  },
  // Turbopack configuration (deprecated experimental.turbo moved here)
  turbopack: {
    // WebSocket bağlantı sorunlarını azalt
    resolveAlias: {
      // Gerekirse buraya alias eklenebilir
    },
  },
};

type MatchCtx = { url: URL; request: Request; sameOrigin: boolean };

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  // Paketin varsayılanları yerine sadece aşağıdaki kurallar
  extendDefaultRuntimeCaching: false,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // Önbellek kuralları (ilk eşleşen uygulanır).
    // ÖNCEKİ DURUM: üst seviyedeki runtimeCaching v10'da yok sayılıyordu; paketin varsayılan
    // "apis" kuralı /api/* için NetworkFirst (10 sn timeout, 24 saat) uyguluyordu →
    // sunucu yavaşsa eski stok/sipariş verisi sessizce gösteriliyordu.
    runtimeCaching: [
      {
        // API: asla cache'leme (auth'lu, canlı veri)
        urlPattern: ({ sameOrigin, url }: MatchCtx) => sameOrigin && url.pathname.startsWith('/api/'),
        handler: 'NetworkOnly',
      },
      {
        // Realtime / Supabase path'leri
        urlPattern: ({ url }: MatchCtx) =>
          url.pathname.startsWith('/realtime/') || url.pathname.startsWith('/rest/'),
        handler: 'NetworkOnly',
      },
      {
        // Next.js build çıktıları: içerik hash'li, değişmez
        urlPattern: ({ sameOrigin, url }: MatchCtx) =>
          sameOrigin && url.pathname.startsWith('/_next/static/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        // İkon / görsel / font
        urlPattern: ({ sameOrigin, request }: MatchCtx) =>
          sameOrigin && ['image', 'font'].includes(request.destination),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'assets',
          expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        // Sayfa kabukları (HTML): ağı tercih et, 5 sn içinde cevap yoksa son kopyayı göster.
        // Sayfalar statik kabuk; veri API'den canlı geldiği için kabuğun eski olması sorun değil.
        urlPattern: ({ sameOrigin, request }: MatchCtx) => sameOrigin && request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      // Diğer her şey (RSC payload'ları, cross-origin dahil): kural yok → doğrudan ağ
    ],
  },
})(nextConfig);
