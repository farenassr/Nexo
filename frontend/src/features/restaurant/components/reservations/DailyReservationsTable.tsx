import { Clock3, DoorOpen } from 'lucide-react';
import labels from '../../labels.es.json';
import { RestaurantReservationStatus, type RestaurantReservationDetail } from '../../types';
import { EmptyState, InlineError, SkeletonRows } from '../restaurantUi';
import { ReservationCard } from '../DailyReservationList';

export function DailyReservationsTable({
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
  reservations: RestaurantReservationDetail[];
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
    <div className="daily-reservations-table">
      {!hasRestaurantContext && <EmptyState icon={<DoorOpen size={22} />} title={labels.states.branchRequired} />}
      {isError && <InlineError error={error} />}
      {isPending && hasRestaurantContext && <SkeletonRows count={4} />}
      {!isPending && hasRestaurantContext && reservations.length === 0 && (
        <EmptyState icon={<Clock3 size={22} />} title={labels.states.noReservations} />
      )}
      {reservations.map((reservation) => (
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
    </div>
  );
}
