import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 5,
          heartbeatIntervalMs: 30000,
          reconnectAfterMs: [1000, 2000, 5000, 10000, 30000]
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

