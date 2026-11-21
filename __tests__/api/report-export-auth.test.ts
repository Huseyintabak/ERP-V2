/**
 * @jest-environment node
 *
 * Rapor export'ları sadece yöneticiye açık (Raporlar sayfası da sadece yöneticide görünür).
 * Rol, middleware'in JWT'den yazdığı x-user-role header'ından okunur.
 * Üretim kaydı geri alma: yönetici/planlama veya kaydın sahibi operatör dışında herkes 403.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { GET as exportOperators } from '@/app/api/reports/export/operators/route';
import { GET as exportProduction } from '@/app/api/reports/export/production/route';
import { GET as exportOrders } from '@/app/api/reports/export/orders/route';
import { GET as exportStock } from '@/app/api/reports/export/stock/route';
import { POST as rollback } from '@/app/api/production-logs/rollback/route';

jest.mock('@/lib/auth/jwt', () => ({ verifyJWT: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/utils/logger', () => ({ logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

const fromCalls: string[] = [];
beforeEach(() => {
  fromCalls.length = 0;
  (createClient as jest.Mock).mockImplementation(async () => ({
    from: (t: string) => {
      fromCalls.push(t);
      const b: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'order', 'gte', 'lte', 'in', 'limit']) b[m] = () => b;
      b.single = async () => ({
        data: { id: 'l1', operator_id: 'someone-else', timestamp: new Date().toISOString(),
                production_plans: { id: 'p1', status: 'devam_ediyor' } },
        error: null,
      });
      b.then = (r: (x: unknown) => unknown) => r({ data: [], error: null });
      return b;
    },
    rpc: async () => ({ data: { success: true }, error: null }),
  }));
});

const get = (path: string, role?: string) =>
  new NextRequest(`http://localhost${path}`, { headers: role ? { 'x-user-role': role } : {} });

describe('report exports', () => {
  const routes: Array<[string, (r: NextRequest) => Promise<Response>]> = [
    ['operators', exportOperators], ['production', exportProduction], ['orders', exportOrders], ['stock', exportStock],
  ];
  it.each(routes)('%s: 403 for non-admin roles without touching the DB', async (name, handler) => {
    for (const role of ['operator', 'depo', 'planlama', undefined]) {
      const res = await handler(get(`/api/reports/export/${name}`, role));
      expect(res.status).toBe(403);
    }
    expect(fromCalls).toEqual([]);
  });
  it.each(routes)('%s: allowed for yonetici', async (name, handler) => {
    const res = await handler(get(`/api/reports/export/${name}`, 'yonetici'));
    expect(res.status).not.toBe(403);
  });
});

describe('POST /api/production-logs/rollback', () => {
  const post = () => new NextRequest('http://localhost/api/production-logs/rollback', {
    method: 'POST', headers: { cookie: 'thunder_token=t', 'content-type': 'application/json' },
    body: JSON.stringify({ logId: 'l1', reason: 'x' }),
  });
  it('denies roles other than admin/planlama/operator (e.g. depo)', async () => {
    (verifyJWT as jest.Mock).mockResolvedValue({ userId: 'd1', role: 'depo' });
    expect((await rollback(post())).status).toBe(403);
  });
  it('denies an operator rolling back someone else’s log', async () => {
    (verifyJWT as jest.Mock).mockResolvedValue({ userId: 'op1', role: 'operator' });
    expect((await rollback(post())).status).toBe(403);
  });
});
