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
  });
});
