import type { Metadata } from "next";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { WebSocketErrorSuppressor } from "@/components/websocket-error-suppressor";

// Google Fonts yerine sistem fontları kullanılıyor (sunucu network sorunu için)
// Inter font fallback olarak system-ui kullanılacak

export const metadata: Metadata = {
  title: "Thunder ERP v2 - Üretim Yönetim Sistemi",
  description: "Modern, real-time ERP sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
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
