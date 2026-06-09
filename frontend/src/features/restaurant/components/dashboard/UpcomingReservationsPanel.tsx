import { Clock, Users } from 'lucide-react';
import labels from '../../labels.es.json';
import { EmptyState, formatTime, statusLabel } from '../restaurantUi';
import type { RestaurantUpcomingReservationSummary } from '../../types';

export function UpcomingReservationsPanel({ reservations }: { reservations: RestaurantUpcomingReservationSummary[] }) {
  if (reservations.length === 0) {
    return <EmptyState icon={<Clock size={22} />} title={labels.states.noReservations} />;
  }

  return (
    <div className="dashboard-upcoming-list">
      {reservations.map((reservation) => (
        <article className="reservation-card compact-reservation-card" key={reservation.reservationId}>
          <div className="reservation-main">
            <div>
              <strong>{reservation.customerName}</strong>
              <span>
                {formatTime(reservation.startAt)} - {formatTime(reservation.endAt)}
              </span>
            </div>
            <span className="status-badge" data-status={statusLabel(reservation.status).replace(/\s/g, '').toLowerCase()}>
              {statusLabel(reservation.status)}
            </span>
          </div>
          <dl className="reservation-facts">
            <div>
              <dt>{labels.fields.party}</dt>
              <dd>
                <Users size={14} /> {reservation.partySize}
              </dd>
            </div>
            <div>
              <dt>{labels.reservations.tableFilter}</dt>
              <dd>{reservation.tableLabels.length > 0 ? reservation.tableLabels.join(', ') : labels.states.unassigned}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
