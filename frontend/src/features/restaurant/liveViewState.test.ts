import { describe, expect, it } from 'vitest';
import { getNextTableReservation, getTableActionState } from './liveViewState';
import { RestaurantReservationSource, RestaurantReservationStatus, RestaurantTableVisualStatus } from './types';

describe('liveViewState', () => {
  it('selects the next non-terminal reservation after the service instant', () => {
    const next = getNextTableReservation(
      [
        reservation('past', '2026-06-08T17:00:00.000Z', RestaurantReservationStatus.Completed),
        reservation('cancelled', '2026-06-08T18:15:00.000Z', RestaurantReservationStatus.Cancelled),
        reservation('next', '2026-06-08T19:00:00.000Z', RestaurantReservationStatus.Confirmed),
        reservation('later', '2026-06-08T20:00:00.000Z', RestaurantReservationStatus.Pending),
      ],
      '2026-06-08T18:30:00.000Z',
    );

    expect(next?.reservationId).toBe('next');
  });

  it('disables operational actions when table status or selection makes them invalid', () => {
    expect(getTableActionState(null, [])).toEqual({
      canCreateReservation: false,
      canBlockTable: false,
      canMarkSeated: false,
      canMarkCompleted: false,
      canCancelReservation: false,
    });

    expect(
      getTableActionState(
        { tableId: 'table-1', label: 'T1', areaId: null, status: RestaurantTableVisualStatus.Available, reason: null, reservationId: null },
        [reservation('confirmed', '2026-06-08T19:00:00.000Z', RestaurantReservationStatus.Confirmed)],
      ),
    ).toMatchObject({
      canCreateReservation: true,
      canBlockTable: true,
      canMarkSeated: true,
      canMarkCompleted: false,
      canCancelReservation: true,
    });
  });
});

function reservation(reservationId: string, startAt: string, status: RestaurantReservationStatus) {
  return {
    reservationId,
    branchId: 'branch-1',
    partySize: 2,
    startAt,
    endAt: '2026-06-08T20:00:00.000Z',
    turnoverBufferMinutes: 15,
    status,
    source: RestaurantReservationSource.Staff,
    specialRequests: null,
    cancelledAt: null,
    cancellationReason: null,
    customer: {
      customerId: `customer-${reservationId}`,
      fullName: 'Ava Chen',
      phone: null,
      email: null,
    },
    tables: [{ tableId: 'table-1', label: 'T1' }],
    statusHistory: [],
  };
}
