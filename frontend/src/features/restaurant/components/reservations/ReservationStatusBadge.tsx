import { statusLabel, statusToken } from '../restaurantUi';
import type { RestaurantReservationStatus } from '../../types';

export function ReservationStatusBadge({ status }: { status: RestaurantReservationStatus }) {
  return (
    <span className="status-badge" data-status={statusToken(status)}>
      {statusLabel(status)}
    </span>
  );
}
