import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

export function createClient() {
  // Supabase Realtime anon key ile çalışır
  // RLS (Row Level Security) ile korunur
  // Custom JWT token kontrolü hook'larda yapılıyor (cookie check)
  // Bu sayede /api/auth/me çağrısına gerek kalmaz ve 401 hatası oluşmaz
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      realtime: {
        params: {
          eventsPerSecond: 1, // Very conservative
          heartbeatIntervalMs: 180000, // 3 minutes - extremely conservative
          reconnectAfterMs: [10000, 20000, 30000, 60000, 120000] // Very conservative reconnection
        },
        // Suppress WebSocket errors in console (they're handled by hooks)
        log_level: process.env.NODE_ENV === 'development' ? 'info' : 'error'
      },
      global: {
        headers: {
          'X-Client-Info': 'thunder-erp@1.0.0'
        }
      },
      db: {
        schema: 'public'
      }
    }
  );
}

