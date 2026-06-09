import labels from '../../labels.es.json';
import { RestaurantTableVisualStatus } from '../../types';
import { visualStatusToken } from '../restaurantUi';

export function TableStatusLegend() {
  const items = [
    [RestaurantTableVisualStatus.Available, labels.status.available],
    [RestaurantTableVisualStatus.Reserved, labels.status.reserved],
    [RestaurantTableVisualStatus.Occupied, labels.status.occupied],
    [RestaurantTableVisualStatus.Blocked, labels.status.blocked],
    [RestaurantTableVisualStatus.Cleaning, labels.status.cleaning],
    [RestaurantTableVisualStatus.Inactive, labels.status.inactive],
  ] as const;

  return (
    <div className="status-legend" aria-label={labels.sections.floor}>
      {items.map(([status, label]) => (
        <span key={status} data-status={visualStatusToken(status)}>
          <i />
          {label}
        </span>
      ))}
    </div>
  );
}
