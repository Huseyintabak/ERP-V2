/**
 * @jest-environment node
 *
 * Ürün silme kuralları:
 *  - Nihai ürünün BOM'u varsa silinemez (önceden yanlış kolona bakıldığı için kontrol hiç çalışmıyordu)
 *  - Yarı mamulün kendi BOM'u (semi_bom) varsa veya başka bir BOM'da malzemeyse silinemez
 *  - Kontrol sorgusu hata verirse silme YAPILMAZ (fail closed)
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DELETE as deleteFinished } from '@/app/api/stock/finished/[id]/route';
import { DELETE as deleteSemi } from '@/app/api/stock/semi/[id]/route';

jest.mock('@/lib/auth/jwt', () => ({
  verifyJWT: jest.fn(async () => ({ userId: 'u1', role: 'yonetici', email: 'a' })),
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/utils/logger', () => ({ logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

type Result = { data: unknown; error: { message: string } | null };
let responses: Record<string, Result>;
let filters: Array<{ table: string; column: string; value: unknown }>;
let deletedTables: string[];

function builder(table: string) {
  let isDelete = false;
  const b: Record<string, unknown> = {
    select: () => b,
    limit: () => b,
    eq: (column: string, value: unknown) => {
      filters.push({ table, column, value });
      return b;
    },
    delete: () => {
      isDelete = true;
      deletedTables.push(table);
      return b;
    },
    then: (resolve: (r: Result) => unknown) =>
      resolve(isDelete ? { data: null, error: null } : responses[table] ?? { data: [], error: null }),
  };
  return b;
}

beforeEach(() => {
  responses = {};
  filters = [];
  deletedTables = [];
  (createClient as jest.Mock).mockImplementation(async () => ({ from: (t: string) => builder(t) }));
});

const ID = 'prod-1';
const req = (path: string) =>
  new NextRequest(`http://localhost${path}`, { method: 'DELETE', headers: { cookie: 'thunder_token=t' } });
const ctx = { params: Promise.resolve({ id: ID }) };

describe('DELETE /api/stock/finished/[id]', () => {
  it('refuses when the product has a BOM (checks bom.finished_product_id)', async () => {
    responses.bom = { data: [{ id: 'b1' }], error: null };
    const res = await deleteFinished(req(`/api/stock/finished/${ID}`), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/BOM/);
    expect(filters).toContainEqual({ table: 'bom', column: 'finished_product_id', value: ID });
    expect(deletedTables).not.toContain('finished_products');
  });

  it('refuses when the product is in orders', async () => {
    responses.order_items = { data: [{ id: 'o1' }], error: null };
    const res = await deleteFinished(req(`/api/stock/finished/${ID}`), ctx);
    expect(res.status).toBe(400);
    expect(deletedTables).not.toContain('finished_products');
  });

  it('fails closed when the BOM check errors', async () => {
    responses.bom = { data: null, error: { message: 'column bom.product_id does not exist' } };
    const res = await deleteFinished(req(`/api/stock/finished/${ID}`), ctx);
    expect(res.status).toBe(500);
    expect(deletedTables).not.toContain('finished_products');
  });

  it('deletes a product without BOM or orders', async () => {
    const res = await deleteFinished(req(`/api/stock/finished/${ID}`), ctx);
    expect(res.status).toBe(200);
    expect(deletedTables).toContain('finished_products');
  });
});

describe('DELETE /api/stock/semi/[id]', () => {
  it('refuses when the semi product has its own BOM (semi_bom)', async () => {
    responses.semi_bom = { data: [{ id: 's1' }], error: null };
    const res = await deleteSemi(req(`/api/stock/semi/${ID}`), ctx);
    expect(res.status).toBe(400);
    expect(filters).toContainEqual({ table: 'semi_bom', column: 'semi_product_id', value: ID });
    expect(deletedTables).not.toContain('semi_finished_products');
  });

  it('refuses when the semi product is a material in a BOM', async () => {
    responses.bom = { data: [{ id: 'b1' }], error: null };
    const res = await deleteSemi(req(`/api/stock/semi/${ID}`), ctx);
    expect(res.status).toBe(400);
    expect(deletedTables).not.toContain('semi_finished_products');
  });

  it('fails closed when a check errors', async () => {
    responses.semi_bom = { data: null, error: { message: 'boom' } };
    const res = await deleteSemi(req(`/api/stock/semi/${ID}`), ctx);
    expect(res.status).toBe(500);
    expect(deletedTables).not.toContain('semi_finished_products');
  });

  it('deletes an unused semi product', async () => {
    const res = await deleteSemi(req(`/api/stock/semi/${ID}`), ctx);
    expect(res.status).toBe(200);
    expect(deletedTables).toContain('semi_finished_products');
  });
});
