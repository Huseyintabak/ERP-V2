/**
 * @jest-environment node
 *
 * Sipariş iptal yetkisi: yönetici/planlama her siparişi, diğer roller sadece kendi
 * oluşturduklarını iptal edebilir (can_cancel_order DB fonksiyonuyla aynı kural).
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { createClient } from '@/lib/supabase/server';
import { POST as cancelOrder } from '@/app/api/orders/cancel/route';

jest.mock('@/lib/auth/jwt', () => ({ verifyJWT: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/utils/logger', () => ({ logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

const OWNER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

const rpc = jest.fn(async () => ({ data: { success: true }, error: null }));

function mockOrder(createdBy: string) {
  const query = {
    select: () => query,
    eq: () => query,
    single: async () => ({
      data: {
        id: 'order-1',
        status: 'beklemede',
        created_by: createdBy,
        production_plans: [{ id: 'plan-1', status: 'planlandi', produced_quantity: 0, target_quantity: 10 }],
      },
      error: null,
    }),
  };
  (createClient as jest.Mock).mockImplementation(async () => ({ from: () => query, rpc }));
}

function request() {
  return new NextRequest('http://localhost/api/orders/cancel', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'thunder_token=t' },
    body: JSON.stringify({ orderId: 'order-1', reason: 'test' }),
  });
}

beforeEach(() => {
  rpc.mockClear();
});

describe('POST /api/orders/cancel permissions', () => {
  it('rejects an operator cancelling someone else’s order', async () => {
    (verifyJWT as jest.Mock).mockImplementation(async () => ({ userId: OTHER, role: 'operator' }));
    mockOrder(OWNER);
    const res = await cancelOrder(request());
    expect(res.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a depo user cancelling someone else’s order', async () => {
    (verifyJWT as jest.Mock).mockImplementation(async () => ({ userId: OTHER, role: 'depo' }));
    mockOrder(OWNER);
    expect((await cancelOrder(request())).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('allows the order owner', async () => {
    (verifyJWT as jest.Mock).mockImplementation(async () => ({ userId: OWNER, role: 'depo' }));
    mockOrder(OWNER);
    await cancelOrder(request());
    expect(rpc).toHaveBeenCalledWith('cancel_order_with_plans', expect.anything());
  });

  it('allows planlama to cancel any order', async () => {
    (verifyJWT as jest.Mock).mockImplementation(async () => ({ userId: OTHER, role: 'planlama' }));
    mockOrder(OWNER);
    await cancelOrder(request());
    expect(rpc).toHaveBeenCalledWith('cancel_order_with_plans', expect.anything());
  });
});
