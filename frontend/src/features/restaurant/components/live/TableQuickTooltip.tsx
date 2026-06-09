import labels from '../../labels.es.json';
import { RestaurantTableVisualStatus, type RestaurantTableLayoutDetail, type RestaurantTableStatusDetail } from '../../types';
import { visualStatusLabel } from '../restaurantUi';

export function TableQuickTooltip({
  table,
  status,
}: {
  table: RestaurantTableLayoutDetail;
  status: RestaurantTableStatusDetail | null;
}) {
  const visualStatus = status?.status ?? RestaurantTableVisualStatus.Available;

  return (
    <span className="table-quick-tooltip" role="tooltip">
      <strong>{table.tableLabel}</strong>
      <span>{visualStatusLabel(visualStatus)}</span>
      {status?.reason && <small>{status.reason}</small>}
      {status?.reservationId && <small>{labels.live.linkedReservation}</small>}
    </span>
  );
}
