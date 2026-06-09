import { describe, expect, it } from 'vitest';
import { restaurantQueryKeys } from './queryKeys';
import { RestaurantReservationStatus } from './types';

describe('restaurantQueryKeys', () => {
  it('keeps reservation and status-map keys scoped to selected context', () => {
    expect(
      restaurantQueryKeys.reservations({
        branchId: 'branch-1',
        date: '2026-06-08',
        status: RestaurantReservationStatus.Pending,
      }),
    ).toEqual(['restaurant', 'reservations', 'branch-1', '2026-06-08', 0]);

    expect(restaurantQueryKeys.statusMap('plan-1', '2026-06-08T18:30:00.000Z')).toEqual([
      'restaurant',
      'floor-plan-status-map',
      'plan-1',
      '2026-06-08T18:30:00.000Z',
      null,
    ]);

    expect(restaurantQueryKeys.tableReservations('table-1', '2026-06-08')).toEqual([
      'restaurant',
      'table-reservations',
      'table-1',
      '2026-06-08',
    ]);

    expect(restaurantQueryKeys.tableBlocks('table-1', '2026-06-08')).toEqual([
      'restaurant',
      'table-blocks',
      'table-1',
      '2026-06-08',
    ]);

    expect(restaurantQueryKeys.dashboard('branch-1', '2026-06-08')).toEqual([
      'restaurant',
      'dashboard',
      'branch-1',
      '2026-06-08',
    ]);
  });

  it('keeps UI-only daily reservation filters out of the server reservation key', () => {
    expect(
      restaurantQueryKeys.reservations({
        branchId: 'branch-1',
        date: '2026-06-08',
        status: null,
      }),
    ).toEqual(['restaurant', 'reservations', 'branch-1', '2026-06-08', null]);

    expect(restaurantQueryKeys.reservationFilters('branch-1', '2026-06-08')).toEqual([
      'restaurant',
      'reservation-filters',
      'branch-1',
      '2026-06-08',
    ]);
  });
});
