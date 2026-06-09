import {
  RestaurantReservationStatus,
  RestaurantTableVisualStatus,
  type RestaurantReservationDetail,
  type RestaurantTableStatusDetail,
} from './types';

export interface TableActionState {
  canCreateReservation: boolean;
  canBlockTable: boolean;
  canMarkSeated: boolean;
  canMarkCompleted: boolean;
  canCancelReservation: boolean;
}

const terminalStatuses = new Set<RestaurantReservationStatus>([
  RestaurantReservationStatus.Completed,
  RestaurantReservationStatus.Cancelled,
  RestaurantReservationStatus.NoShow,
]);

export function getNextTableReservation(
  reservations: RestaurantReservationDetail[],
  serviceInstant: string,
): RestaurantReservationDetail | null {
  const instant = new Date(serviceInstant).getTime();

  return (
    reservations
      .filter((reservation) => !terminalStatuses.has(reservation.status))
      .filter((reservation) => new Date(reservation.startAt).getTime() >= instant)
      .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())[0] ?? null
  );
}

export function getTableActionState(
  status: RestaurantTableStatusDetail | null,
  reservations: RestaurantReservationDetail[],
): TableActionState {
  if (!status || status.status === RestaurantTableVisualStatus.Inactive) {
    return disabledActions();
  }

  const selectedReservation = findActionReservation(reservations);
  return {
    canCreateReservation: status.status === RestaurantTableVisualStatus.Available,
    canBlockTable: status.status !== RestaurantTableVisualStatus.Blocked,
    canMarkSeated:
      selectedReservation?.status === RestaurantReservationStatus.Pending
      || selectedReservation?.status === RestaurantReservationStatus.Confirmed,
    canMarkCompleted: selectedReservation?.status === RestaurantReservationStatus.Seated,
    canCancelReservation: Boolean(selectedReservation && !terminalStatuses.has(selectedReservation.status)),
  };
}

export function findActionReservation(reservations: RestaurantReservationDetail[]) {
  return reservations.find((reservation) => !terminalStatuses.has(reservation.status)) ?? null;
}

function disabledActions(): TableActionState {
  return {
    canCreateReservation: false,
    canBlockTable: false,
    canMarkSeated: false,
    canMarkCompleted: false,
    canCancelReservation: false,
  };
}
