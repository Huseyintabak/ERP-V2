import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { WebSocketErrorSuppressor } from "@/components/websocket-error-suppressor";

// Google Fonts yerine sistem fontları kullanılıyor (sunucu network sorunu için)
// Inter font fallback olarak system-ui kullanılacak

export const metadata: Metadata = {
  title: "Thunder ERP v2 - Üretim Yönetim Sistemi",
  description: "Modern, real-time ERP sistemi",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Thunder ERP",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Thunder" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" />
      </head>
      <body className="font-sans antialiased">
        <ErrorBoundary>
          <WebSocketErrorSuppressor />
          {children}
          <Toaster position="top-right" />
        </ErrorBoundary>
      </body>
    </html>
  );
}
