/**
 * useConnectionHealth — sunucuya erişilebilirlik kontrolü
 * @jest-environment jsdom
 *
 * Self-hosted kurulumda /rest/v1 dışarı kapalı; tarayıcıdan PostgREST'e giden sağlık kontrolü
 * hep 404 alıp ~90 sn sonra realtime'ı polling'e düşürüyordu. Kontrol artık kendi API'mize gider.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useConnectionHealth } from '../use-connection-health';

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => {
    throw new Error('health check must not use the browser Supabase client');
  }),
}));

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
});

async function runCheck() {
  const { result } = renderHook(() => useConnectionHealth(60_000, 3));
  return result.current.performHealthCheck();
}

describe('useConnectionHealth', () => {
  it('checks the app API, not PostgREST', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    await runCheck();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toBe('/api/auth/verify');
    expect(url).not.toContain('/rest/v1');
  });

  it('treats any HTTP response (even 401) as reachable', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    expect((await runCheck()).isHealthy).toBe(true);
  });

  it('treats 5xx gateway errors as unhealthy', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502 });
    expect((await runCheck()).isHealthy).toBe(false);
  });

  it('treats network errors as unhealthy', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const r = await runCheck();
    expect(r.isHealthy).toBe(false);
    expect(r.error).toContain('Failed to fetch');
  });
});
