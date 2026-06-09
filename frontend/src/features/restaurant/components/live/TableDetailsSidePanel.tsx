import { CalendarPlus, Check, Clock3, Edit3, ShieldOff, Utensils, XCircle } from 'lucide-react';
import { getNextTableReservation, resolveTableAreaName, type TableActionState } from '../../liveViewState';
import labels from '../../labels.es.json';
import {
  type RestaurantAreaLayoutDetail,
  RestaurantReservationStatus,
  RestaurantTableVisualStatus,
  type RestaurantReservationDetail,
  type RestaurantTableLayoutDetail,
  type RestaurantTableStatusDetail,
} from '../../types';
import { EmptyState, Field, InlineError, SkeletonRows, visualStatusLabel, visualStatusToken } from '../restaurantUi';

export function TableDetailsSidePanel({
  table,
  areas,
  status,
  reservations,
  serviceInstant,
  actionReason,
  actionState,
  isMutating,
  isBlocking,
  isLoadingReservations,
  reservationsError,
  onReasonChange,
  onCreateReservation,
  onBlockTable,
  onMarkSeated,
  onMarkCompleted,
  onCancelReservation,
  onEditTable,
}: {
  table: RestaurantTableLayoutDetail | null;
  areas: RestaurantAreaLayoutDetail[];
  status: RestaurantTableStatusDetail | null;
  reservations: RestaurantReservationDetail[];
  serviceInstant: string;
  actionReason: string;
  actionState: TableActionState;
  isMutating: boolean;
  isBlocking: boolean;
  isLoadingReservations: boolean;
  reservationsError: unknown;
  onReasonChange: (value: string) => void;
  onCreateReservation: () => void;
  onBlockTable: () => void;
  onMarkSeated: () => void;
  onMarkCompleted: () => void;
  onCancelReservation: () => void;
  onEditTable: () => void;
}) {
  if (!table) {
    return <EmptyState icon={<Utensils size={22} />} title={labels.states.noTableSelected} />;
  }

  const visualStatus = status?.status ?? RestaurantTableVisualStatus.Available;
  const nextReservation = getNextTableReservation(reservations, serviceInstant);
  const areaName = resolveTableAreaName(table, areas, labels.states.unassigned);

  return (
    <div className="selected-table-body live-table-details">
      <div className="table-summary">
        <div>
          <strong>{table.tableLabel}</strong>
          <span>{status?.reason ?? visualStatusLabel(visualStatus)}</span>
        </div>
        <span className="status-badge" data-status={visualStatusToken(visualStatus)}>
          {visualStatusLabel(visualStatus)}
        </span>
      </div>

      <dl className="live-table-facts">
        <div>
          <dt>{labels.live.area}</dt>
          <dd>{areaName}</dd>
        </div>
        <div>
          <dt>{labels.live.currentStatus}</dt>
          <dd>{visualStatusLabel(visualStatus)}</dd>
        </div>
        <div>
          <dt>{labels.live.nextReservation}</dt>
          <dd>{nextReservation ? nextReservation.customer.fullName : labels.states.noReservations}</dd>
        </div>
      </dl>

      <div className="live-action-grid">
        <button type="button" className="secondary-button" disabled={!actionState.canCreateReservation || isMutating} onClick={onCreateReservation}>
          <CalendarPlus size={16} />
          {labels.actions.create}
        </button>
        <button type="button" className="secondary-button" disabled={!actionState.canBlockTable || isBlocking} onClick={onBlockTable}>
          <ShieldOff size={16} />
          {labels.actions.blockTable}
        </button>
        <button type="button" className="secondary-button" disabled={!actionState.canMarkSeated || isMutating} onClick={onMarkSeated}>
          <Utensils size={16} />
          {labels.actions.seated}
        </button>
        <button type="button" className="secondary-button" disabled={!actionState.canMarkCompleted || isMutating} onClick={onMarkCompleted}>
          <Check size={16} />
          {labels.actions.completed}
        </button>
        <button type="button" className="danger-button" disabled={!actionState.canCancelReservation || isMutating} onClick={onCancelReservation}>
          <XCircle size={16} />
          {labels.actions.cancel}
        </button>
        <button type="button" className="secondary-button" onClick={onEditTable}>
          <Edit3 size={16} />
          {labels.actions.editTable}
        </button>
      </div>

      <Field label={labels.fields.reason}>
        <input value={actionReason} onChange={(event) => onReasonChange(event.target.value)} placeholder={labels.live.reasonPlaceholder} />
      </Field>

      <div className="table-reservations">
        {reservationsError ? <InlineError error={reservationsError} /> : null}
        {isLoadingReservations && <SkeletonRows count={2} />}
        {!isLoadingReservations && reservations.length === 0 && (
          <EmptyState icon={<Clock3 size={18} />} title={labels.states.noTableReservations} />
        )}
        {reservations.map((reservation) => (
          <article key={reservation.reservationId} className="reservation-card compact-reservation-card">
            <div className="reservation-main">
              <div>
                <strong>{reservation.customer.fullName}</strong>
                <span>{new Date(reservation.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <span className="status-badge" data-status={reservationStatusToken(reservation.status)}>
                {reservationStatusLabel(reservation.status)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function reservationStatusLabel(status: RestaurantReservationStatus) {
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

function reservationStatusToken(status: RestaurantReservationStatus) {
  switch (status) {
    case RestaurantReservationStatus.Pending:
      return 'pending';
    case RestaurantReservationStatus.Confirmed:
      return 'confirmed';
    case RestaurantReservationStatus.Seated:
      return 'seated';
    case RestaurantReservationStatus.Completed:
      return 'completed';
    case RestaurantReservationStatus.Cancelled:
      return 'cancelled';
    case RestaurantReservationStatus.NoShow:
      return 'noshow';
  }
}
