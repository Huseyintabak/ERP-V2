/**
 * Test ortamı için Supabase client
 * Next.js cookies kullanmadan direkt Supabase client oluşturur
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Test ortamı için Supabase client oluştur
 * Cookies kullanmadan direkt client oluşturur
 * 
 * @param useServiceRole - Service role key kullan (RLS bypass için, default: false)
 */
export function createTestClient(useServiceRole: boolean = false) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be set for test environment');
  }

  // Service role key kullan (RLS bypass için)
  if (useServiceRole) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set for test environment when using service role');
    }
    
    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  // Anon key kullan (normal erişim)
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY must be set for test environment');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

