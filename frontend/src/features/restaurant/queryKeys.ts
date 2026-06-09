import type { RestaurantReservationStatus } from './types';

export interface ReservationListKeyInput {
  branchId: string;
  date: string;
  status: RestaurantReservationStatus | null;
}

export const restaurantQueryKeys = {
  context: () => ['restaurant', 'context'] as const,
  dashboard: (branchId: string, date: string) => ['restaurant', 'dashboard', branchId, date] as const,
  floorPlans: (branchId: string, floorId: string) =>
    ['restaurant', 'floor-plans', branchId, floorId] as const,
  floorPlan: (floorPlanId: string) => ['restaurant', 'floor-plan', floorPlanId] as const,
  statusMap: (floorPlanId: string, at: string, areaId: string | null = null) =>
    ['restaurant', 'floor-plan-status-map', floorPlanId, at, areaId] as const,
  reservations: ({ branchId, date, status }: ReservationListKeyInput) =>
    ['restaurant', 'reservations', branchId, date, status] as const,
  reservationFilters: (branchId: string, date: string) => ['restaurant', 'reservation-filters', branchId, date] as const,
  tableReservations: (tableId: string, date: string) => ['restaurant', 'table-reservations', tableId, date] as const,
  tableBlocks: (tableId: string, date: string) => ['restaurant', 'table-blocks', tableId, date] as const,
  availability: (branchId: string, startAt: string, partySize: number, durationMinutes: number | null) =>
    ['restaurant', 'availability', branchId, startAt, partySize, durationMinutes] as const,
};
