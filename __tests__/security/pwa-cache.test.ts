/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { clearLegacyCaches, clearPrivateCaches } from '@/lib/utils/pwa-cache';

let deleted: string[] = [];

beforeEach(() => {
  deleted = [];
  const cachesMock = { delete: async (name: string) => (deleted.push(name), true) };
  (globalThis as any).window = { caches: cachesMock };
  (globalThis as any).caches = cachesMock;
});

describe('PWA cache cleanup', () => {
  it('removes the legacy "apis" cache that held stale API responses', async () => {
    await clearLegacyCaches();
    expect(deleted).toContain('apis');
    expect(deleted).not.toContain('next-static'); // hash'li statik dosyalar korunur
  });

  it('logout also clears per-user page shells', async () => {
    await clearPrivateCaches();
    expect(deleted).toEqual(expect.arrayContaining(['apis', 'pages', 'start-url']));
  });

  it('is a no-op when Cache API is unavailable', async () => {
    (globalThis as any).window = {};
    await expect(clearPrivateCaches()).resolves.toBeUndefined();
    expect(deleted).toEqual([]);
  });
});
