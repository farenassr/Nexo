import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import labels from '../labels.es.json';
import { RestaurantReservationSource, RestaurantReservationStatus, RestaurantTableVisualStatus } from '../types';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function PanelHeader({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="panel-header">
      <div>
        {icon}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="empty-state">
      {icon}
      <span>{title}</span>
    </div>
  );
}

export function InlineError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : labels.states.requestFailed;
  return (
    <div className="inline-error" role="alert">
      <CircleAlert size={17} />
      <span>{message}</span>
    </div>
  );
}

export function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="skeleton-list" role="status" aria-label={labels.states.loading}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

export function statusLabel(status: RestaurantReservationStatus) {
  switch (status) {
    case RestaurantReservationStatus.Pending:
      return labels.status.pending;
    case RestaurantReservationStatus.Confirmed:
      return labels.status.confirmed;
    case RestaurantReservationStatus.Seated:
      return labels.status.seated;
    case RestaurantReservationStatus.Completed:
      return labels.status.completed;
    case RestaurantReservationStatus.Cancelled:
      return labels.status.cancelled;
    case RestaurantReservationStatus.NoShow:
      return labels.status.noShow;
  }
}

export function sourceLabel(source: RestaurantReservationSource) {
  switch (source) {
    case RestaurantReservationSource.Phone:
      return labels.sources.phone;
    case RestaurantReservationSource.WalkIn:
      return labels.sources.walkIn;
    case RestaurantReservationSource.Website:
      return labels.sources.website;
    case RestaurantReservationSource.Staff:
      return labels.sources.staff;
    case RestaurantReservationSource.Partner:
      return labels.sources.partner;
    case RestaurantReservationSource.Other:
      return labels.sources.other;
  }
}

export function visualStatusLabel(status: RestaurantTableVisualStatus) {
  switch (status) {
    case RestaurantTableVisualStatus.Inactive:
      return labels.status.inactive;
    case RestaurantTableVisualStatus.Blocked:
      return labels.status.blocked;
    case RestaurantTableVisualStatus.Occupied:
      return labels.status.occupied;
    case RestaurantTableVisualStatus.Reserved:
      return labels.status.reserved;
    case RestaurantTableVisualStatus.Cleaning:
      return labels.status.cleaning;
    case RestaurantTableVisualStatus.Available:
      return labels.status.available;
  }
}

export function visualStatusToken(status: RestaurantTableVisualStatus) {
  switch (status) {
    case RestaurantTableVisualStatus.Inactive:
      return 'inactive';
    case RestaurantTableVisualStatus.Blocked:
      return 'blocked';
    case RestaurantTableVisualStatus.Occupied:
      return 'occupied';
    case RestaurantTableVisualStatus.Reserved:
      return 'reserved';
    case RestaurantTableVisualStatus.Cleaning:
      return 'cleaning';
    case RestaurantTableVisualStatus.Available:
      return 'available';
  }
}

export function statusToken(status: RestaurantReservationStatus) {
  return statusLabel(status).replace(/\s/g, '').toLowerCase();
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
