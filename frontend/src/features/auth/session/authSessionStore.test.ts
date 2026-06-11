import { describe, expect, it, vi } from 'vitest';
import { anonymousSession, type AuthSession } from '../api/authApi';
import { createAuthSessionStore } from './authSessionStore';

describe('authSessionStore', () => {
  it('reloads the current session through a zustand store action', async () => {
    const session: AuthSession = {
      isAuthenticated: true,
      userId: 'user-1',
      name: 'Ada',
      email: 'ada@example.com',
      organizationId: 'organization-1',
      roles: ['admin'],
      claims: [],
    };
    const store = createAuthSessionStore({
      getCurrentSession: vi.fn().mockResolvedValue(session),
      logout: vi.fn(),
      redirectToLogin: vi.fn(),
    });

    await store.getState().reload();

    expect(store.getState().session).toEqual(session);
    expect(store.getState().status).toBe('authenticated');
  });

  it('returns to anonymous state when logout succeeds without redirect', async () => {
    const redirectToLogin = vi.fn();
    const store = createAuthSessionStore({
      getCurrentSession: vi.fn(),
      logout: vi.fn().mockResolvedValue(null),
      redirectToLogin,
    });

    store.setState({
      session: { ...anonymousSession, isAuthenticated: true, userId: 'user-1' },
      status: 'authenticated',
    });

    await store.getState().logout();

    expect(store.getState().session).toEqual(anonymousSession);
    expect(store.getState().status).toBe('unauthenticated');
    expect(redirectToLogin).not.toHaveBeenCalled();
  });
});
