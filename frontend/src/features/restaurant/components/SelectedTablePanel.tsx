import { Clock3, SlidersHorizontal } from 'lucide-react';
import labels from '../labels.es.json';
import {
  RestaurantReservationStatus,
  RestaurantTableShape,
  RestaurantTableVisualStatus,
  type RestaurantReservationDetail,
  type RestaurantTableLayoutDetail,
  type RestaurantTableStatusDetail,
} from '../types';
import { ReservationCard } from './DailyReservationList';
import { EmptyState, Field, InlineError, PanelHeader, SkeletonRows, visualStatusLabel, visualStatusToken } from './restaurantUi';

export function SelectedTablePanel({
  table,
  status,
  reservations,
  actionReason,
  onReasonChange,
  isMutating,
  isLoadingReservations,
  reservationsError,
  isEditingLayout,
  onStatus,
  onCancel,
  onPatchTable,
}: {
  table: RestaurantTableLayoutDetail;
  status: RestaurantTableStatusDetail | null;
  reservations: RestaurantReservationDetail[];
  actionReason: string;
  onReasonChange: (value: string) => void;
  isMutating: boolean;
  isLoadingReservations: boolean;
  reservationsError: unknown;
  isEditingLayout: boolean;
  onStatus: (reservationId: string, status: RestaurantReservationStatus) => void;
  onCancel: (reservationId: string) => void;
  onPatchTable: (patch: Partial<RestaurantTableLayoutDetail>) => void;
}) {
  return (
    <div className="selected-table-body">
      <div className="table-summary">
        <div>
          <strong>{table.tableLabel}</strong>
          <span>{status?.reason ?? visualStatusLabel(status?.status ?? RestaurantTableVisualStatus.Available)}</span>
        </div>
        <span className="status-badge" data-status={visualStatusToken(status?.status ?? RestaurantTableVisualStatus.Available)}>
          {visualStatusLabel(status?.status ?? RestaurantTableVisualStatus.Available)}
        </span>
      </div>

      {isEditingLayout && (
        <div className="layout-properties">
          <PanelHeader icon={<SlidersHorizontal size={16} />} title={labels.sections.layout} />
          <div className="layout-fields">
            <NumberField label={labels.fields.x} value={table.x} onChange={(x) => onPatchTable({ x })} />
            <NumberField label={labels.fields.y} value={table.y} onChange={(y) => onPatchTable({ y })} />
            <NumberField label={labels.fields.width} value={table.width} onChange={(width) => onPatchTable({ width })} />
            <NumberField label={labels.fields.height} value={table.height} onChange={(height) => onPatchTable({ height })} />
            <NumberField
              label={labels.fields.rotation}
              value={table.rotationDegrees}
              onChange={(rotationDegrees) => onPatchTable({ rotationDegrees })}
            />
          </div>
          <Field label={labels.fields.shape}>
            <select
              value={table.shape}
              onChange={(event) => onPatchTable({ shape: Number(event.target.value) as RestaurantTableShape })}
            >
              <option value={RestaurantTableShape.Round}>{labels.shapes.round}</option>
              <option value={RestaurantTableShape.Square}>{labels.shapes.square}</option>
              <option value={RestaurantTableShape.Rectangle}>{labels.shapes.rectangle}</option>
              <option value={RestaurantTableShape.Booth}>{labels.shapes.booth}</option>
              <option value={RestaurantTableShape.Bar}>{labels.shapes.bar}</option>
            </select>
          </Field>
        </div>
      )}

      <div className="table-reservations">
        {reservationsError ? <InlineError error={reservationsError} /> : null}
        {isLoadingReservations && <SkeletonRows count={2} />}
        {!isLoadingReservations && reservations.length === 0 && (
          <EmptyState icon={<Clock3 size={18} />} title={labels.states.noTableReservations} />
        )}
        {reservations.map((reservation) => (
          <ReservationCard
            key={reservation.reservationId}
            reservation={reservation}
            actionReason={actionReason}
            onReasonChange={onReasonChange}
            isMutating={isMutating}
            onStatus={(nextStatus) => onStatus(reservation.reservationId, nextStatus)}
            onCancel={() => onCancel(reservation.reservationId)}
          />
        ))}
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" value={Math.round(value)} onChange={(event) => onChange(Number(event.target.value))} />
    </Field>
  );
}
