const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
}

export function getCsrfToken(cookie = globalThis.document?.cookie ?? '') {
  return cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('nexo.csrf='))
    ?.slice('nexo.csrf='.length);
}

export async function bffFetch(path: string, init: RequestInit = {}) {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const csrfToken = getCsrfToken();
  if (unsafeMethods.has(method) && csrfToken && !headers.has('X-CSRF-TOKEN')) {
    headers.set('X-CSRF-TOKEN', csrfToken);
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    method,
    credentials: 'include',
    headers,
  });
}
