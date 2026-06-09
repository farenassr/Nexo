import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRestaurantReservation,
  cancelRestaurantReservation,
  listRestaurantReservations,
  listRestaurantTableReservations,
  RestaurantApiError,
  saveRestaurantFloorPlan,
  searchRestaurantAvailability,
  updateRestaurantTableLayout,
} from './restaurantApi';
import { RestaurantReservationSource, RestaurantReservationStatus, RestaurantTableShape } from '../types';

describe('restaurantApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it('normalizes network failures for recovery flows', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(listRestaurantReservations({ branchId: 'branch-1', date: '2026-06-08', status: null })).rejects.toEqual(
      new RestaurantApiError('NetworkError', 'No se pudo conectar con el API de restaurante.', 0),
    );
  });

  it('normalizes malformed JSON responses from successful requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{not-json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(listRestaurantReservations({ branchId: 'branch-1', date: '2026-06-08', status: null })).rejects.toEqual(
      new RestaurantApiError('InvalidResponse', 'La respuesta del API de restaurante no es valida.', 200),
    );
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

  it('uses Phase 4 floor-plan editor route contracts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 'floor-plan-1' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'floor-plan-1' }))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await saveRestaurantFloorPlan('floor-plan-1', {
      name: 'Cena principal',
      canvasWidth: 1200,
      canvasHeight: 760,
      gridSize: 20,
      isActive: true,
      areaLayouts: [
        {
          areaId: 'area-1',
          x: 20,
          y: 20,
          width: 520,
          height: 320,
          rotationDegrees: 0,
          zIndex: 1,
        },
      ],
      tableLayouts: [
        {
          tableId: 'table-1',
          x: 120,
          y: 160,
          width: 96,
          height: 72,
          rotationDegrees: 0,
          shape: RestaurantTableShape.Rectangle,
          zIndex: 4,
          seatLayouts: [{ seatNumber: 1, x: 10, y: 12, rotationDegrees: 0 }],
        },
      ],
    });

    await updateRestaurantTableLayout('floor-plan-1', 'table-1', {
      x: 140,
      y: 180,
      width: 96,
      height: 72,
      rotationDegrees: 15,
      shape: RestaurantTableShape.Rectangle,
      zIndex: 4,
      seatLayouts: [{ seatNumber: 1, x: 10, y: 12, rotationDegrees: 0 }],
    });

    await listRestaurantTableReservations('table-1', '2026-06-08');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/v1/restaurant/floor-plans/floor-plan-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          name: 'Cena principal',
          canvasWidth: 1200,
          canvasHeight: 760,
          gridSize: 20,
          isActive: true,
          areaLayouts: [
            {
              areaId: 'area-1',
              x: 20,
              y: 20,
              width: 520,
              height: 320,
              rotationDegrees: 0,
              zIndex: 1,
            },
          ],
          tableLayouts: [
            {
              tableId: 'table-1',
              x: 120,
              y: 160,
              width: 96,
              height: 72,
              rotationDegrees: 0,
              shape: RestaurantTableShape.Rectangle,
              zIndex: 4,
              seatLayouts: [{ seatNumber: 1, x: 10, y: 12, rotationDegrees: 0 }],
            },
          ],
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/v1/restaurant/floor-plans/floor-plan-1/tables/table-1/layout',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          x: 140,
          y: 180,
          width: 96,
          height: 72,
          rotationDegrees: 15,
          shape: RestaurantTableShape.Rectangle,
          zIndex: 4,
          seatLayouts: [{ seatNumber: 1, x: 10, y: 12, rotationDegrees: 0 }],
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/v1/restaurant/tables/table-1/reservations?date=2026-06-08',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
