/**
 * @jest-environment node
 *
 * Plan tamamlama: sipariş sadece TÜM planları kapanınca (tamamlandi/iptal) "tamamlandi" olur.
 * Önceden çok ürünlü siparişte ilk plan bitince sipariş tamamlanmış sayılıyordu.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/production/plan-status/route';

jest.mock('@/lib/auth/jwt', () => ({
  verifyJWT: jest.fn(async () => ({ userId: 'u1', role: 'yonetici', email: 'a' })),
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/utils/logger', () => ({ logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

const plan = { id: 'p1', order_id: 'o1', status: 'devam_ediyor', planned_quantity: 10, produced_quantity: 10, assigned_operator_id: 'op1' };
let openPlans: unknown[];
let updates: Array<{ table: string; data: Record<string, unknown> }>;

function builder(table: string) {
  let updateData: Record<string, unknown> | null = null;
  let isOpenPlansQuery = false;
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    limit: () => b,
    not: () => { isOpenPlansQuery = true; return b; },
    update: (d: Record<string, unknown>) => { updateData = d; updates.push({ table, data: d }); return b; },
    single: async () => ({ data: updateData ? { ...plan, ...updateData } : plan, error: null }),
    then: (resolve: (r: unknown) => unknown) =>
      resolve({ data: isOpenPlansQuery ? openPlans : null, error: null }),
  };
  return b;
}

beforeEach(() => {
  openPlans = [];
  updates = [];
  (createClient as jest.Mock).mockImplementation(async () => ({ from: (t: string) => builder(t) }));
});

const complete = () =>
  POST(new NextRequest('http://localhost/api/production/plan-status', {
    method: 'POST',
    headers: { cookie: 'thunder_token=t', 'content-type': 'application/json' },
    body: JSON.stringify({ plan_id: 'p1', action: 'complete' }),
  }));

describe('POST /api/production/plan-status complete', () => {
  it('completes the order when no other plan is open', async () => {
    const res = await complete();
    expect(res.status).toBe(200);
    expect(updates).toContainEqual({ table: 'orders', data: { status: 'tamamlandi' } });
  });

  it('keeps the order open while another plan of the order is still open', async () => {
    openPlans = [{ id: 'p2' }];
    const res = await complete();
    expect(res.status).toBe(200);
    expect(updates.find((u) => u.table === 'production_plans')?.data.status).toBe('tamamlandi');
    expect(updates.some((u) => u.table === 'orders')).toBe(false);
  });
});
