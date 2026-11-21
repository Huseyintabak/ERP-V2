/**
 * @jest-environment node
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';

const SECRET = 'test-secret-for-middleware-at-least-32-chars';

type MiddlewareFn = (req: NextRequest) => Promise<Response>;
let middleware: MiddlewareFn;

async function sign(payload: Record<string, unknown>, secret = SECRET, exp = '1h') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(secret));
}

function req(path: string, init: { cookie?: string; headers?: Record<string, string> } = {}) {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set('cookie', `thunder_token=${init.cookie}`);
  return new NextRequest(new URL(path, 'http://localhost:3000'), { headers });
}

/** NextResponse.next({ request: { headers } }) ile override edilen header değerini okur */
function forwardedHeader(res: Response, name: string): string | null {
  return res.headers.get(`x-middleware-request-${name}`);
}

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  delete process.env.AI_ENABLED;
  jest.resetModules();
  middleware = (await import('@/middleware')).middleware as MiddlewareFn;
});

describe('middleware — API auth', () => {
  it('rejects protected API without token', async () => {
    const res = await middleware(req('/api/stock/raw'));
    expect(res.status).toBe(401);
  });

  it('rejects spoofed x-user-id header without token', async () => {
    const res = await middleware(
      req('/api/operators', { headers: { 'x-user-id': 'attacker', 'x-user-role': 'yonetici' } })
    );
    expect(res.status).toBe(401);
  });

  it('rejects token signed with a different secret', async () => {
    const token = await sign({ userId: 'u1', role: 'yonetici' }, 'wrong-secret-wrong-secret-wrong-secret');
    const res = await middleware(req('/api/stock/raw', { cookie: token }));
    expect(res.status).toBe(401);
  });

  it('rejects expired token', async () => {
    const token = await sign({ userId: 'u1', role: 'yonetici' }, SECRET, '-1s');
    const res = await middleware(req('/api/stock/raw', { cookie: token }));
    expect(res.status).toBe(401);
  });

  it('passes valid token and overwrites identity headers from JWT', async () => {
    const token = await sign({ userId: 'real-user', role: 'depo', email: 'd@x.com' });
    const res = await middleware(
      req('/api/stock/raw', { cookie: token, headers: { 'x-user-id': 'spoofed', 'x-user-role': 'yonetici' } })
    );
    expect(res.status).toBe(200);
    expect(forwardedHeader(res, 'x-user-id')).toBe('real-user');
    expect(forwardedHeader(res, 'x-user-role')).toBe('depo');
  });

  it('accepts Bearer token', async () => {
    const token = await sign({ userId: 'u2', role: 'planlama' });
    const res = await middleware(req('/api/orders', { headers: { authorization: `Bearer ${token}` } }));
    expect(res.status).toBe(200);
  });

  it('allows public API routes without token but strips spoofed identity', async () => {
    const res = await middleware(req('/api/auth/login', { headers: { 'x-user-id': 'spoofed' } }));
    expect(res.status).toBe(200);
    expect(forwardedHeader(res, 'x-user-id')).toBeNull();
  });

  it('protects /api/auth/verify (used by nginx auth_request for realtime)', async () => {
    expect((await middleware(req('/api/auth/verify'))).status).toBe(401);
    const token = await sign({ userId: 'u1', role: 'operator' });
    expect((await middleware(req('/api/auth/verify', { cookie: token }))).status).toBe(200);
  });

  it('returns 404 for AI routes when AI is disabled, even with valid token', async () => {
    const token = await sign({ userId: 'u1', role: 'yonetici' });
    const res = await middleware(req('/api/ai/dashboard', { cookie: token }));
    expect(res.status).toBe(404);
  });
});

describe('middleware — matcher', () => {
  it('runs on every /api path, including ones ending with a file extension', async () => {
    const { config } = await import('@/middleware');
    // Next.js matcher'ı path-to-regexp ile derler; aynı davranışı burada simüle ediyoruz
    // @ts-expect-error — Next'in derlenmiş kopyası tip tanımı içermiyor
    const { pathToRegexp } = await import('next/dist/compiled/path-to-regexp');
    const matches = (path: string) =>
      (config.matcher as string[]).some((m) => pathToRegexp(m).test(path));

    expect(matches('/api/bom/abc.json')).toBe(true);
    expect(matches('/api/products/by-barcode/123.png')).toBe(true);
    expect(matches('/api/stock/raw')).toBe(true);
    expect(matches('/dashboard')).toBe(true);
    expect(matches('/favicon.svg')).toBe(false);
    expect(matches('/_next/static/chunks/x.js')).toBe(false);
  });
});

describe('middleware — pages', () => {
  it('allows login page without token', async () => {
    const res = await middleware(req('/login'));
    expect(res.status).toBe(200);
  });

  it('redirects to /login with invalid cookie', async () => {
    const res = await middleware(req('/dashboard', { cookie: 'garbage' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('redirects operator pages to /operator-login', async () => {
    const res = await middleware(req('/operator-dashboard'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/operator-login');
  });

  it('redirects AI pages to /dashboard when AI is disabled', async () => {
    const token = await sign({ userId: 'u1', role: 'yonetici' });
    const res = await middleware(req('/ai-dashboard', { cookie: token }));
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('redirects to the public host (from Host / X-Forwarded-Proto), not the internal origin', async () => {
    // Nginx arkasında Next, request.url'i iç adresle (127.0.0.1:3000) görür
    const internal = new NextRequest(new URL('/dashboard', 'http://127.0.0.1:3000'), {
      headers: new Headers({ host: '45.143.97.57', 'x-forwarded-proto': 'http' }),
    });
    const res = await middleware(internal);
    expect(res.headers.get('location')).toBe('http://45.143.97.57/login');

    const https = new NextRequest(new URL('/dashboard', 'http://127.0.0.1:3000'), {
      headers: new Headers({ host: 'erp.example.com', 'x-forwarded-proto': 'https' }),
    });
    expect((await middleware(https)).headers.get('location')).toBe('https://erp.example.com/login');
  });

  it('passes valid token on normal pages', async () => {
    const token = await sign({ userId: 'u1', role: 'yonetici' });
    const res = await middleware(req('/dashboard', { cookie: token }));
    expect(res.status).toBe(200);
  });
});
