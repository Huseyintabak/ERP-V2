import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 2, // Reduced from 5 to 2
          heartbeatIntervalMs: 60000, // Increased from 30000 to 60000
          reconnectAfterMs: [2000, 5000, 10000, 20000, 30000] // More conservative reconnection
        }
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

