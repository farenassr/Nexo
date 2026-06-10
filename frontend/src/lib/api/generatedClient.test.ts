import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './generatedClient';

describe('generatedClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the BFF with credentials and serialized query params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: 42 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await apiClient<{ value: number }>({
      url: '/v1/restaurant/dashboard',
      method: 'GET',
      params: { branchId: 'branch-1', date: '2026-06-10', empty: undefined },
    });

    expect(response.data).toEqual({ value: 42 });
    expect(fetchMock).toHaveBeenCalledWith('/v1/restaurant/dashboard?branchId=branch-1&date=2026-06-10', {
      credentials: 'include',
      method: 'GET',
      body: undefined,
      signal: undefined,
      headers: expect.any(Headers),
    });
  });

  it('throws a normalized API error for non-success responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'RestaurantConflict', message: 'Mesa ocupada.' }), {
        status: 409,
        statusText: 'Conflict',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      apiClient({
        url: '/v1/restaurant/reservations',
        method: 'POST',
        data: { branchId: 'branch-1' },
      }),
    ).rejects.toMatchObject({
      code: 'RestaurantConflict',
      message: 'Mesa ocupada.',
      status: 409,
    });
  });
});
