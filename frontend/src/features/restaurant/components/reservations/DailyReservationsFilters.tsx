import { Search } from 'lucide-react';
import labels from '../../labels.es.json';
import type { DailyReservationFilters } from '../../reservationFilters';
import { RestaurantReservationStatus } from '../../types';
import { Field } from '../restaurantUi';

export function DailyReservationsFilters({
  branchId,
  date,
  status,
  filters,
  onBranchChange,
  onDateChange,
  onStatusChange,
  onFiltersChange,
}: {
  branchId: string;
  date: string;
  status: RestaurantReservationStatus | null;
  filters: DailyReservationFilters;
  onBranchChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onStatusChange: (value: RestaurantReservationStatus | null) => void;
  onFiltersChange: (patch: Partial<DailyReservationFilters>) => void;
}) {
  return (
    <section className="setup-panel reservations-filter-panel" aria-label={labels.reservations.filters}>
      <Field label={labels.setup.branchId}>
        <input value={branchId} onChange={(event) => onBranchChange(event.target.value)} placeholder="branch-id" />
      </Field>
      <Field label={labels.setup.date}>
        <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
      </Field>
      <Field label={labels.setup.time}>
        <input
          type="time"
          value={filters.serviceTime}
          onChange={(event) => onFiltersChange({ serviceTime: event.target.value })}
        />
      </Field>
      <Field label={labels.reservations.statusFilter}>
        <select value={status ?? ''} onChange={(event) => onStatusChange(toReservationStatus(event.target.value))}>
          <option value="">{labels.reservations.allStatuses}</option>
          <option value={RestaurantReservationStatus.Pending}>{labels.status.pending}</option>
          <option value={RestaurantReservationStatus.Confirmed}>{labels.status.confirmed}</option>
          <option value={RestaurantReservationStatus.Seated}>{labels.status.seated}</option>
          <option value={RestaurantReservationStatus.Completed}>{labels.status.completed}</option>
          <option value={RestaurantReservationStatus.Cancelled}>{labels.status.cancelled}</option>
          <option value={RestaurantReservationStatus.NoShow}>{labels.status.noShow}</option>
        </select>
      </Field>
      <Field label={labels.setup.floorId}>
        <input value={filters.floorId} onChange={(event) => onFiltersChange({ floorId: event.target.value })} />
      </Field>
      <Field label={labels.setup.areaFilter}>
        <input value={filters.areaId} onChange={(event) => onFiltersChange({ areaId: event.target.value })} />
      </Field>
      <Field label={labels.reservations.tableFilter}>
        <input value={filters.tableId} onChange={(event) => onFiltersChange({ tableId: event.target.value })} />
      </Field>
      <Field label={labels.reservations.customerSearch}>
        <div className="filter-search-input">
          <Search size={15} />
          <input
            value={filters.customerSearch}
            onChange={(event) => onFiltersChange({ customerSearch: event.target.value })}
            placeholder={labels.reservations.customerSearchPlaceholder}
          />
        </div>
      </Field>
    </section>
  );
}

function toReservationStatus(value: string): RestaurantReservationStatus | null {
  return value === '' ? null : (Number(value) as RestaurantReservationStatus);
}
