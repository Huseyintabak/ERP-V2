/**
 * @jest-environment node
 *
 * Self-hosted kurulumda sunucu tarafı Supabase client'ları Kong'a iç adresten
 * (SUPABASE_INTERNAL_URL) gitmeli. Public adres (NEXT_PUBLIC_SUPABASE_URL) Nginx'te
 * /rest/v1 için 404 döner — admin client oraya giderse login dahil her şey kırılır.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

const INTERNAL = 'http://127.0.0.1:8000';
const PUBLIC = 'http://45.143.97.57';

beforeEach(() => {
  jest.resetModules();
  process.env.SUPABASE_INTERNAL_URL = INTERNAL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = PUBLIC;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
});

describe('server-side Supabase URL', () => {
  it('createAdminClient uses SUPABASE_INTERNAL_URL', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const client = createAdminClient() as unknown as { supabaseUrl: string };
    expect(client.supabaseUrl).toBe(INTERNAL);
  });

  it('falls back to NEXT_PUBLIC_SUPABASE_URL when internal URL is not set', async () => {
    delete process.env.SUPABASE_INTERNAL_URL;
    const { createAdminClient } = await import('@/lib/supabase/server');
    const client = createAdminClient() as unknown as { supabaseUrl: string };
    expect(client.supabaseUrl).toBe(PUBLIC);
  });

  it('getServerSupabaseUrl prefers internal URL', async () => {
    const { getServerSupabaseUrl } = await import('@/lib/supabase/server');
    expect(getServerSupabaseUrl()).toBe(INTERNAL);
  });
});
