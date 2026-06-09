import { Check, Loader2, Search, Utensils } from 'lucide-react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import labels from '../labels.es.json';
import type { ReservationFormState } from '../state/restaurantWorkspaceState';
import type { RestaurantAvailabilitySearchResult } from '../types';
import { Field, Metric } from './restaurantUi';

export function ReservationCreatePanel({
  reservationForm,
  availabilityResult,
  selectedTableIds,
  selectedTableLabels,
  canSearchAvailability,
  canCreateReservation,
  isSearchingAvailability,
  isCreatingReservation,
  setReservationForm,
  setSelectedTableIds,
  onAvailabilitySearch,
  onCreateReservation,
}: {
  reservationForm: ReservationFormState;
  availabilityResult: RestaurantAvailabilitySearchResult | null;
  selectedTableIds: string[];
  selectedTableLabels: string;
  canSearchAvailability: boolean;
  canCreateReservation: boolean;
  isSearchingAvailability: boolean;
  isCreatingReservation: boolean;
  setReservationForm: Dispatch<SetStateAction<ReservationFormState>>;
  setSelectedTableIds: Dispatch<SetStateAction<string[]>>;
  onAvailabilitySearch: (event: FormEvent<HTMLFormElement>) => void;
  onCreateReservation: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <form className="booking-form" onSubmit={onAvailabilitySearch}>
        <div className="form-row">
          <Field label={labels.fields.party}>
            <input
              type="number"
              min={1}
              value={reservationForm.partySize}
              onChange={(event) => setReservationForm((current) => ({ ...current, partySize: Number(event.target.value) }))}
            />
          </Field>
          <Field label={labels.fields.duration}>
            <input
              type="number"
              min={15}
              step={15}
              value={reservationForm.durationMinutes}
              onChange={(event) => setReservationForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))}
            />
          </Field>
        </div>
        <button type="submit" className="primary-button" disabled={!canSearchAvailability || isSearchingAvailability}>
          {isSearchingAvailability ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
          {labels.actions.search}
        </button>
      </form>

      {availabilityResult && (
        <div className="availability-results">
          <div className="metric-strip">
            <Metric label={labels.status.available} value={availabilityResult.availableTables.length} />
            <Metric label={labels.availability.rejected} value={availabilityResult.rejections.length} />
          </div>
          <div className="table-options">
            {availabilityResult.availableTables.map((table) => {
              const selected = selectedTableIds.includes(table.tableId);
              return (
                <button
                  key={table.tableId}
                  type="button"
                  className="table-option"
                  aria-pressed={selected}
                  onClick={() =>
                    setSelectedTableIds((current) =>
                      current.includes(table.tableId)
                        ? current.filter((tableId) => tableId !== table.tableId)
                        : [...current, table.tableId],
                    )
                  }
                >
                  <span>{table.label}</span>
                  <small>
                    {table.minCapacity}-{table.maxCapacity}
                  </small>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form className="booking-form create-form" onSubmit={onCreateReservation}>
        <Field label={labels.fields.guest}>
          <input
            value={reservationForm.customerFullName}
            onChange={(event) => setReservationForm((current) => ({ ...current, customerFullName: event.target.value }))}
          />
        </Field>
        <div className="form-row">
          <Field label={labels.fields.phone}>
            <input
              value={reservationForm.customerPhone}
              onChange={(event) => setReservationForm((current) => ({ ...current, customerPhone: event.target.value }))}
            />
          </Field>
          <Field label={labels.fields.email}>
            <input
              type="email"
              value={reservationForm.customerEmail}
              onChange={(event) => setReservationForm((current) => ({ ...current, customerEmail: event.target.value }))}
            />
          </Field>
        </div>
        <Field label={labels.fields.notes}>
          <textarea
            value={reservationForm.specialRequests}
            onChange={(event) => setReservationForm((current) => ({ ...current, specialRequests: event.target.value }))}
            rows={3}
          />
        </Field>
        <div className="selected-tables">
          <Utensils size={16} />
          <span>{selectedTableLabels || labels.states.noTableSelected}</span>
        </div>
        <button type="submit" className="primary-button" disabled={!canCreateReservation || isCreatingReservation}>
          {isCreatingReservation ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
          {labels.actions.create}
        </button>
      </form>
    </>
  );
}
