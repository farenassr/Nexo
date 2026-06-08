import { describe, expect, it, vi } from 'vitest';
import {
  createRestaurantReservation,
  cancelRestaurantReservation,
  listRestaurantReservations,
  RestaurantApiError,
  searchRestaurantAvailability,
} from './restaurantApi';
import { RestaurantReservationSource, RestaurantReservationStatus } from '../types';

describe('restaurantApi', () => {
  it('lists reservations with branch, date, and optional status query parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await listRestaurantReservations({
      branchId: '00000000-0000-7000-8000-000000000101',
      date: '2026-06-08',
      status: RestaurantReservationStatus.Confirmed,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/restaurant/reservations?branchId=00000000-0000-7000-8000-000000000101&date=2026-06-08&status=1',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sends availability and reservation requests as backend contract payloads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ availableTables: [], rejections: [] }))
      .mockResolvedValueOnce(jsonResponse({ reservationId: 'reservation-1' }));
    vi.stubGlobal('fetch', fetchMock);

    await searchRestaurantAvailability({
      branchId: 'branch-1',
      partySize: 4,
      startAt: '2026-06-08T18:30:00.000Z',
      durationMinutes: 90,
    });
    await createRestaurantReservation({
      branchId: 'branch-1',
      tableIds: ['table-1', 'table-2'],
      partySize: 4,
      startAt: '2026-06-08T18:30:00.000Z',
      durationMinutes: 90,
      customerFullName: 'Ava Chen',
      customerPhone: '+15550100',
      customerEmail: 'ava@example.com',
      source: RestaurantReservationSource.Staff,
      specialRequests: 'Window seat',
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      branchId: 'branch-1',
      partySize: 4,
      startAt: '2026-06-08T18:30:00.000Z',
      durationMinutes: 90,
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      branchId: 'branch-1',
      tableIds: ['table-1', 'table-2'],
      partySize: 4,
      startAt: '2026-06-08T18:30:00.000Z',
      durationMinutes: 90,
      customerFullName: 'Ava Chen',
      customerPhone: '+15550100',
      customerEmail: 'ava@example.com',
      source: RestaurantReservationSource.Staff,
      specialRequests: 'Window seat',
    });
  });

  it('normalizes operation error responses from the backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            code: 'Conflict',
            message: 'Selected tables are already reserved.',
          },
          409,
        ),
      ),
    );

    await expect(
      createRestaurantReservation({
        branchId: 'branch-1',
        tableIds: ['table-1'],
        partySize: 2,
        startAt: '2026-06-08T18:30:00.000Z',
        durationMinutes: null,
        customerFullName: 'Ava Chen',
        customerPhone: null,
        customerEmail: null,
        source: RestaurantReservationSource.Staff,
        specialRequests: null,
      }),
    ).rejects.toEqual(new RestaurantApiError('Conflict', 'Selected tables are already reserved.', 409));
  });

  it('uses the backend cancellation route contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ reservationId: 'reservation-1' }));
    vi.stubGlobal('fetch', fetchMock);

    await cancelRestaurantReservation('reservation-1', 'Guest requested cancellation');

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/restaurant/reservations/reservation-1/cancel',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'Guest requested cancellation' }),
      }),
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
