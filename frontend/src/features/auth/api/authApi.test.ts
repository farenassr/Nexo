import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentSession, logout, refreshSession } from './authApi';

describe('authApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the current user using only backend cookies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ isAuthenticated: true, claims: [], roles: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await getCurrentSession();

    expect(fetchMock).toHaveBeenCalledWith('/auth/me', expect.objectContaining({ credentials: 'include' }));
  });

  it('refreshes and logs out with credentials and csrf header', async () => {
    vi.stubGlobal('document', { cookie: 'nexo.csrf=csrf-123' });
    const fetchMock = vi.fn().mockResolvedValue(emptyResponse());
    vi.stubGlobal('fetch', fetchMock);

    await refreshSession();
    await logout();

    const refreshInit = fetchMock.mock.calls[0][1] as RequestInit;
    const logoutInit = fetchMock.mock.calls[1][1] as RequestInit;

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/auth/refresh', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));
    expect(new Headers(refreshInit.headers).get('X-CSRF-TOKEN')).toBe('csrf-123');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/auth/logout', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));
    expect(new Headers(logoutInit.headers).get('X-CSRF-TOKEN')).toBe('csrf-123');
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function emptyResponse(): Response {
  return new Response(null, { status: 204 });
}
