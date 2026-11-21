import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Sunucu tarafı Supabase URL'i.
 * Self-hosted kurulumda Next.js, Kong'a iç ağdan (SUPABASE_INTERNAL_URL, örn. http://127.0.0.1:8000)
 * erişir; NEXT_PUBLIC_SUPABASE_URL ise tarayıcının realtime için kullandığı public adrestir.
 */
export function getServerSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getServerSupabaseUrl()!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Server Component'te set çağrısı ignore edilebilir
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Server Component'te remove çağrısı ignore edilebilir
          }
        },
      },
    }
  );
}

// Service role için (admin işlemleri)
// Service role key için @supabase/supabase-js kullan (cookie handling gerekmez)
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

