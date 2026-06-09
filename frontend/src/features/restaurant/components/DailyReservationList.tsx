import { Clock3, DoorOpen, X } from 'lucide-react';
import labels from '../labels.es.json';
import { RestaurantReservationStatus, type RestaurantReservationDetail } from '../types';
import { EmptyState, formatTime, InlineError, sourceLabel, statusLabel, statusToken, SkeletonRows } from './restaurantUi';

export function DailyReservationList({
  hasRestaurantContext,
  reservations,
  actionReason,
  isError,
  error,
  isPending,
  isMutating,
  onReasonChange,
  onStatus,
  onCancel,
}: {
  hasRestaurantContext: boolean;
  reservations: RestaurantReservationDetail[] | undefined;
  actionReason: string;
  isError: boolean;
  error: unknown;
  isPending: boolean;
  isMutating: boolean;
  onReasonChange: (value: string) => void;
  onStatus: (reservationId: string, status: RestaurantReservationStatus) => void;
  onCancel: (reservationId: string) => void;
}) {
  return (
    <>
      {!hasRestaurantContext && <EmptyState icon={<DoorOpen size={22} />} title={labels.states.branchRequired} />}
      {isError && <InlineError error={error} />}
      {isPending && hasRestaurantContext && <SkeletonRows count={4} />}
      {reservations?.length === 0 && <EmptyState icon={<Clock3 size={22} />} title={labels.states.noReservations} />}
      {reservations?.map((reservation) => (
        <ReservationCard
          key={reservation.reservationId}
          reservation={reservation}
          actionReason={actionReason}
          onReasonChange={onReasonChange}
          isMutating={isMutating}
          onStatus={(status) => onStatus(reservation.reservationId, status)}
          onCancel={() => onCancel(reservation.reservationId)}
        />
      ))}
    </>
  );
}

export function ReservationCard({
  reservation,
  actionReason,
  onReasonChange,
  isMutating,
  onStatus,
  onCancel,
}: {
  reservation: RestaurantReservationDetail;
  actionReason: string;
  onReasonChange: (value: string) => void;
  isMutating: boolean;
  onStatus: (status: RestaurantReservationStatus) => void;
  onCancel: () => void;
}) {
  const transitions = nextStatuses(reservation.status);
  return (
    <article className="reservation-card">
      <div className="reservation-main">
        <div>
          <strong>{reservation.customer.fullName}</strong>
          <span>{reservation.tables.map((table) => table.label).join(', ') || labels.states.unassigned}</span>
        </div>
        <StatusBadge status={reservation.status} />
      </div>
      <dl className="reservation-facts">
        <div>
          <dt>{labels.fields.hour}</dt>
          <dd>
            {formatTime(reservation.startAt)}-{formatTime(reservation.endAt)}
          </dd>
        </div>
        <div>
          <dt>{labels.fields.party}</dt>
          <dd>{reservation.partySize}</dd>
        </div>
        <div>
          <dt>{labels.fields.source}</dt>
          <dd>{sourceLabel(reservation.source)}</dd>
        </div>
      </dl>
      {reservation.specialRequests && <p className="reservation-note">{reservation.specialRequests}</p>}
      {transitions.length > 0 && (
        <div className="reservation-actions">
          <input value={actionReason} onChange={(event) => onReasonChange(event.target.value)} placeholder={labels.fields.reason} />
          {transitions.map((status) =>
            status === RestaurantReservationStatus.Cancelled ? (
              <button key={status} type="button" className="danger-button" onClick={onCancel} disabled={isMutating}>
                <X size={15} />
                {labels.actions.cancel}
              </button>
            ) : (
              <button key={status} type="button" className="secondary-button" onClick={() => onStatus(status)} disabled={isMutating}>
                {statusLabel(status)}
              </button>
            ),
          )}
        </div>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: RestaurantReservationStatus }) {
  return (
    <span className="status-badge" data-status={statusToken(status)}>
      {statusLabel(status)}
    </span>
  );
}

function nextStatuses(status: RestaurantReservationStatus): RestaurantReservationStatus[] {
  switch (status) {
    case RestaurantReservationStatus.Pending:
      return [RestaurantReservationStatus.Confirmed, RestaurantReservationStatus.Seated, RestaurantReservationStatus.Cancelled];
    case RestaurantReservationStatus.Confirmed:
      return [RestaurantReservationStatus.Seated, RestaurantReservationStatus.Completed, RestaurantReservationStatus.Cancelled];
    case RestaurantReservationStatus.Seated:
      return [RestaurantReservationStatus.Completed, RestaurantReservationStatus.Cancelled];
    default:
      return [];
  }
}
