import { describe, expect, it } from 'vitest';
import { filterDailyReservations, canSubmitReservationModal } from './reservationFilters';
import { RestaurantReservationSource, RestaurantReservationStatus, type RestaurantReservationDetail } from './types';

describe('reservationFilters', () => {
  it('filters daily reservations by time, table, and customer text within the loaded day', () => {
    const reservations = [
      reservation({
        reservationId: 'reservation-1',
        customerName: 'Ava Chen',
        startAt: '2026-06-08T18:30:00.000Z',
        tableId: 'table-1',
        tableLabel: 'A1',
      }),
      reservation({
        reservationId: 'reservation-2',
        customerName: 'Marco Silva',
        startAt: '2026-06-08T20:00:00.000Z',
        tableId: 'table-2',
        tableLabel: 'B4',
      }),
    ];

    expect(
      filterDailyReservations(
        reservations,
        {
          serviceTime: '18:30',
          floorId: 'floor-1',
          areaId: 'area-1',
          tableId: 'table-1',
          customerSearch: 'ava',
        },
        [
          { tableId: 'table-1', floorId: 'floor-1', areaId: 'area-1' },
          { tableId: 'table-2', floorId: 'floor-2', areaId: 'area-2' },
        ],
      ).map((item) => item.reservationId),
    ).toEqual(['reservation-1']);
  });

  it('does not drop all reservations for floor or area filters before table metadata is loaded', () => {
    const reservations = [
      reservation({
        reservationId: 'reservation-1',
        customerName: 'Ava Chen',
        startAt: '2026-06-08T18:30:00.000Z',
        tableId: 'table-1',
        tableLabel: 'A1',
      }),
    ];

    expect(
      filterDailyReservations(reservations, {
        serviceTime: '',
        floorId: '',
        areaId: 'area-1',
        tableId: '',
        customerSearch: '',
      }).map((item) => item.reservationId),
    ).toEqual(['reservation-1']);
  });

  it('keeps create disabled until branch, time, party, guest, and a table are present', () => {
    expect(
      canSubmitReservationModal({
        branchId: '00000000-0000-7000-8000-000000000101',
        date: '2026-06-08',
        serviceTime: '18:30',
        partySize: 2,
        customerFullName: 'Ava Chen',
        selectedTableIds: ['table-1'],
      }),
    ).toBe(true);

    expect(
      canSubmitReservationModal({
        branchId: '00000000-0000-7000-8000-000000000101',
        date: '2026-06-08',
        serviceTime: '18:30',
        partySize: 0,
        customerFullName: 'Ava Chen',
        selectedTableIds: ['table-1'],
      }),
    ).toBe(false);

    expect(
      canSubmitReservationModal({
        branchId: 'branch-1',
        date: '2026-06-08',
        serviceTime: '18:30',
        partySize: 2,
        customerFullName: 'Ava Chen',
        selectedTableIds: ['table-1'],
      }),
    ).toBe(false);
  });
});

function reservation({
  reservationId,
  customerName,
  startAt,
  tableId,
  tableLabel,
}: {
  reservationId: string;
  customerName: string;
  startAt: string;
  tableId: string;
  tableLabel: string;
}): RestaurantReservationDetail {
  return {
    reservationId,
    branchId: 'branch-1',
    partySize: 2,
    startAt,
    endAt: startAt,
    turnoverBufferMinutes: 15,
    status: RestaurantReservationStatus.Confirmed,
    source: RestaurantReservationSource.Staff,
    specialRequests: null,
    cancelledAt: null,
    cancellationReason: null,
    customer: {
      customerId: `${reservationId}-customer`,
      fullName: customerName,
      phone: null,
      email: null,
    },
    tables: [{ tableId, label: tableLabel }],
    statusHistory: [],
  };
}
