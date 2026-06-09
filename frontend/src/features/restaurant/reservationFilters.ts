import type { RestaurantReservationDetail, RestaurantReservationStatus } from './types';

export interface DailyReservationFilters {
  serviceTime: string;
  floorId: string;
  areaId: string;
  tableId: string;
  customerSearch: string;
}

export interface CreateReservationValidationInput {
  branchId: string;
  date: string;
  serviceTime: string;
  partySize: number;
  customerFullName: string;
  selectedTableIds: string[];
}

export interface ReservationListFilters extends DailyReservationFilters {
  branchId: string;
  date: string;
  status: RestaurantReservationStatus | null;
}

export interface ReservationTableContext {
  tableId: string;
  floorId: string;
  areaId: string | null;
}

export const defaultDailyReservationFilters: DailyReservationFilters = {
  serviceTime: '',
  floorId: '',
  areaId: '',
  tableId: '',
  customerSearch: '',
};

export function filterDailyReservations(
  reservations: RestaurantReservationDetail[],
  filters: DailyReservationFilters,
  tableContexts: ReservationTableContext[] = [],
): RestaurantReservationDetail[] {
  const tableNeedle = filters.tableId.trim().toLowerCase();
  const floorNeedle = filters.floorId.trim().toLowerCase();
  const areaNeedle = filters.areaId.trim().toLowerCase();
  const customerNeedle = filters.customerSearch.trim().toLowerCase();
  const serviceTime = filters.serviceTime.trim();
  const tableContextById = new Map(tableContexts.map((context) => [context.tableId, context]));

  return reservations.filter((reservation) => {
    const matchesServiceTime =
      !serviceTime ||
      reservation.startAt.slice(11, 16) === serviceTime ||
      toLocalTime(reservation.startAt) === serviceTime;
    const matchesTable =
      !tableNeedle ||
      reservation.tables.some(
        (table) =>
          table.tableId.toLowerCase().includes(tableNeedle) ||
          table.label.toLowerCase().includes(tableNeedle),
      );
    const matchesFloor =
      !floorNeedle ||
      tableContexts.length === 0 ||
      reservation.tables.some((table) => tableContextById.get(table.tableId)?.floorId.toLowerCase() === floorNeedle);
    const matchesArea =
      !areaNeedle ||
      tableContexts.length === 0 ||
      reservation.tables.some((table) => tableContextById.get(table.tableId)?.areaId?.toLowerCase() === areaNeedle);
    const matchesCustomer =
      !customerNeedle ||
      reservation.customer.fullName.toLowerCase().includes(customerNeedle) ||
      reservation.customer.phone?.toLowerCase().includes(customerNeedle) ||
      reservation.customer.email?.toLowerCase().includes(customerNeedle);

    return matchesServiceTime && matchesTable && matchesFloor && matchesArea && matchesCustomer;
  });
}

function toLocalTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function canSubmitReservationModal(input: CreateReservationValidationInput) {
  return (
    input.branchId.trim().length > 0 &&
    input.date.trim().length > 0 &&
    input.serviceTime.trim().length > 0 &&
    input.partySize > 0 &&
    input.customerFullName.trim().length > 0 &&
    input.selectedTableIds.length > 0
  );
}

export function hasDailyReservationUiFilters(filters: DailyReservationFilters) {
  return Object.values(filters).some((value) => value.trim().length > 0);
}
