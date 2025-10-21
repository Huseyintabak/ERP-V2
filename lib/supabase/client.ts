import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 1, // Very conservative
          heartbeatIntervalMs: 120000, // 2 minutes - very conservative
          reconnectAfterMs: [5000, 10000, 20000, 30000, 60000] // More conservative reconnection
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

