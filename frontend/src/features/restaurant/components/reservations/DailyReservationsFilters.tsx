import { Search } from 'lucide-react';
import labels from '../../labels.es.json';
import type { DailyReservationFilters } from '../../reservationFilters';
import {
  RestaurantReservationStatus,
  type RestaurantAreaLayoutDetail,
  type RestaurantBranchDetail,
  type RestaurantFloorDetail,
  type RestaurantTableLayoutDetail,
} from '../../types';
import { Field } from '../restaurantUi';

export function DailyReservationsFilters({
  branchId,
  branches,
  floors,
  areas,
  tables,
  date,
  status,
  filters,
  onBranchChange,
  onDateChange,
  onStatusChange,
  onFiltersChange,
}: {
  branchId: string;
  branches: RestaurantBranchDetail[];
  floors: RestaurantFloorDetail[];
  areas: RestaurantAreaLayoutDetail[];
  tables: RestaurantTableLayoutDetail[];
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
        <select value={branchId} onChange={(event) => onBranchChange(event.target.value)} disabled={branches.length === 0}>
          <option value="">{labels.states.branchRequired}</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
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
        <select value={filters.floorId} onChange={(event) => onFiltersChange({ floorId: event.target.value, areaId: '', tableId: '' })}>
          <option value="">{labels.setup.allFloors}</option>
          {floors.map((floor) => (
            <option key={floor.id} value={floor.id}>
              {floor.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={labels.setup.areaFilter}>
        <select value={filters.areaId} onChange={(event) => onFiltersChange({ areaId: event.target.value, tableId: '' })}>
          <option value="">{labels.setup.allAreas}</option>
          {areas.map((area) => (
            <option key={area.areaId} value={area.areaId}>
              {area.areaName}
            </option>
          ))}
        </select>
      </Field>
      <Field label={labels.reservations.tableFilter}>
        <select value={filters.tableId} onChange={(event) => onFiltersChange({ tableId: event.target.value })}>
          <option value="">{labels.setup.allTables}</option>
          {tables.map((table) => (
            <option key={table.tableId} value={table.tableId}>
              {table.tableLabel}
            </option>
          ))}
        </select>
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
