import { bffFetch, getApiBaseUrl } from '../../../lib/api/bffFetch';

export interface AuthClaim {
  type: string;
  value: string;
}

export interface AuthSession {
  isAuthenticated: boolean;
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  companyId?: string | null;
  roles: string[];
  claims: AuthClaim[];
}

export const anonymousSession: AuthSession = {
  isAuthenticated: false,
  roles: [],
  claims: [],
};

export async function getCurrentSession(): Promise<AuthSession> {
  const response = await bffFetch('/auth/me');
  if (response.status === 401) {
    return anonymousSession;
  }

  if (!response.ok) {
    throw new Error('No se pudo restaurar la sesion.');
  }

  return (await response.json()) as AuthSession;
}

export async function refreshSession(): Promise<void> {
  const response = await bffFetch('/auth/refresh', { method: 'POST' });
  if (!response.ok) {
    throw new Error('No se pudo renovar la sesion.');
  }
}

export async function logout(): Promise<string | null> {
  const response = await bffFetch('/auth/logout', { method: 'POST' });
  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error('No se pudo cerrar la sesion.');
  }

  const payload = (await response.json()) as { logoutUrl?: string };
  return payload.logoutUrl ?? null;
}

export function redirectToLogin(returnUrl = globalThis.location?.pathname ?? '/') {
  const search = new URLSearchParams({ returnUrl });
  globalThis.location.assign(`${getApiBaseUrl()}/auth/login?${search.toString()}`);
}
