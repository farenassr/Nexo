import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  Activity,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  DoorOpen,
  Loader2,
  Map as MapIcon,
  RefreshCw,
  Search,
  Utensils,
  X,
} from 'lucide-react';
import { type Dispatch, type FormEvent, type ReactNode, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  cancelRestaurantReservation,
  createRestaurantReservation,
  getRestaurantContext,
  getRestaurantFloorPlan,
  getRestaurantFloorPlanStatusMap,
  listRestaurantFloorPlans,
  listRestaurantReservations,
  RestaurantApiError,
  searchRestaurantAvailability,
  updateRestaurantReservationStatus,
  type CreateRestaurantReservationInput,
} from '../api/restaurantApi';
import { restaurantQueryKeys } from '../queryKeys';
import {
  RestaurantReservationSource,
  RestaurantReservationStatus,
  RestaurantTableShape,
  RestaurantTableVisualStatus,
  type RestaurantAvailabilitySearchResult,
  type RestaurantFloorPlanDetail,
  type RestaurantReservationDetail,
  type RestaurantTableStatusDetail,
} from '../types';

interface RestaurantSetup {
  branchId: string;
  floorId: string;
  floorPlanId: string;
  date: string;
  serviceTime: string;
}

interface ReservationFormState {
  partySize: number;
  durationMinutes: number;
  customerFullName: string;
  customerPhone: string;
  customerEmail: string;
  specialRequests: string;
}

const setupStorageKey = 'nexo.restaurant.setup';
const defaultSetup: RestaurantSetup = {
  branchId: '',
  floorId: '',
  floorPlanId: '',
  date: todayIsoDate(),
  serviceTime: '18:30',
};

const defaultReservationForm: ReservationFormState = {
  partySize: 2,
  durationMinutes: 90,
  customerFullName: '',
  customerPhone: '',
  customerEmail: '',
  specialRequests: '',
};

export function RestaurantReservationsPage() {
  const queryClient = useQueryClient();
  const [setup, setSetup] = useStoredSetup();
  const [reservationForm, setReservationForm] = useState(defaultReservationForm);
  const [availabilityResult, setAvailabilityResult] = useState<RestaurantAvailabilitySearchResult | null>(null);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [actionReason, setActionReason] = useState('');

  const serviceInstant = useMemo(() => combineDateAndTime(setup.date, setup.serviceTime), [setup.date, setup.serviceTime]);
  const hasRestaurantContext = setup.branchId.trim().length > 0;
  const hasFloorContext = setup.branchId.trim().length > 0 && setup.floorId.trim().length > 0;

  const contextQuery = useQuery({
    queryKey: restaurantQueryKeys.context(),
    queryFn: getRestaurantContext,
  });

  const reservationsQuery = useQuery({
    queryKey: restaurantQueryKeys.reservations({ branchId: setup.branchId, date: setup.date, status: null }),
    queryFn: () => listRestaurantReservations({ branchId: setup.branchId, date: setup.date, status: null }),
    enabled: hasRestaurantContext,
  });

  const floorPlansQuery = useQuery({
    queryKey: restaurantQueryKeys.floorPlans(setup.branchId, setup.floorId),
    queryFn: () => listRestaurantFloorPlans(setup.branchId, setup.floorId),
    enabled: hasFloorContext,
  });

  useEffect(() => {
    const firstFloorPlanId = floorPlansQuery.data?.[0]?.id;
    if (!setup.floorPlanId && firstFloorPlanId) {
      updateSetup(setSetup, { floorPlanId: firstFloorPlanId });
    }
  }, [floorPlansQuery.data, setSetup, setup.floorPlanId]);

  const floorPlanQuery = useQuery({
    queryKey: restaurantQueryKeys.floorPlan(setup.floorPlanId),
    queryFn: () => getRestaurantFloorPlan(setup.floorPlanId),
    enabled: setup.floorPlanId.trim().length > 0,
  });

  const statusMapQuery = useQuery({
    queryKey: restaurantQueryKeys.statusMap(setup.floorPlanId, serviceInstant),
    queryFn: () => getRestaurantFloorPlanStatusMap(setup.floorPlanId, serviceInstant, null),
    enabled: setup.floorPlanId.trim().length > 0,
  });

  const availabilityMutation = useMutation({
    mutationFn: searchRestaurantAvailability,
    onSuccess: (result) => {
      setAvailabilityResult(result);
      const firstOption = result.availableTables[0];
      setSelectedTableIds(firstOption ? [firstOption.tableId] : []);
    },
    onError: (error) => showMutationError(error, 'Availability search failed'),
  });

  const createReservationMutation = useMutation({
    mutationFn: createRestaurantReservation,
    onSuccess: async () => {
      toast.success('Reservation created');
      setReservationForm(defaultReservationForm);
      setAvailabilityResult(null);
      setSelectedTableIds([]);
      await invalidateRestaurantWork(queryClient);
    },
    onError: (error) => showMutationError(error, 'Reservation could not be created'),
  });

  const statusMutation = useMutation({
    mutationFn: updateRestaurantReservationStatus,
    onSuccess: async () => {
      toast.success('Reservation status updated');
      setActionReason('');
      await invalidateRestaurantWork(queryClient);
    },
    onError: (error) => showMutationError(error, 'Status update failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ reservationId, reason }: { reservationId: string; reason: string | null }) =>
      cancelRestaurantReservation(reservationId, reason),
    onSuccess: async () => {
      toast.success('Reservation cancelled');
      setActionReason('');
      await invalidateRestaurantWork(queryClient);
    },
    onError: (error) => showMutationError(error, 'Cancellation failed'),
  });

  const selectedTableLabels = selectedTableIds
    .map((tableId) => availabilityResult?.availableTables.find((table) => table.tableId === tableId)?.label ?? tableId)
    .join(', ');
  const canSearchAvailability = hasRestaurantContext && reservationForm.partySize > 0 && Boolean(setup.date && setup.serviceTime);
  const canCreateReservation =
    canSearchAvailability && selectedTableIds.length > 0 && reservationForm.customerFullName.trim().length > 0;

  function handleAvailabilitySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    availabilityMutation.mutate({
      branchId: setup.branchId,
      partySize: reservationForm.partySize,
      startAt: serviceInstant,
      durationMinutes: reservationForm.durationMinutes || null,
    });
  }

  function handleCreateReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: CreateRestaurantReservationInput = {
      branchId: setup.branchId,
      tableIds: selectedTableIds,
      partySize: reservationForm.partySize,
      startAt: serviceInstant,
      durationMinutes: reservationForm.durationMinutes || null,
      customerFullName: reservationForm.customerFullName.trim(),
      customerPhone: optionalText(reservationForm.customerPhone),
      customerEmail: optionalText(reservationForm.customerEmail),
      source: RestaurantReservationSource.Staff,
      specialRequests: optionalText(reservationForm.specialRequests),
    };

    createReservationMutation.mutate(payload);
  }

  return (
    <main className="restaurant-page">
      <header className="restaurant-topbar">
        <div>
          <span className="eyebrow">Nexo Restaurant</span>
          <h1>Reservations</h1>
        </div>
        <div className="context-pill" data-state={contextQuery.isError ? 'error' : 'ready'}>
          {contextQuery.isPending ? <Loader2 className="spin" size={16} /> : <Activity size={16} />}
          <span>{contextQuery.data?.moduleKey ?? (contextQuery.isError ? 'Context blocked' : 'Restaurant')}</span>
        </div>
      </header>

      <section className="setup-panel" aria-label="Restaurant setup">
        <Field label="Branch ID">
          <input
            value={setup.branchId}
            onChange={(event) => updateSetup(setSetup, { branchId: event.target.value })}
            placeholder="00000000-0000-7000-8000-000000000101"
          />
        </Field>
        <Field label="Floor ID">
          <input
            value={setup.floorId}
            onChange={(event) => updateSetup(setSetup, { floorId: event.target.value, floorPlanId: '' })}
            placeholder="00000000-0000-7000-8000-000000000201"
          />
        </Field>
        <Field label="Date">
          <input type="date" value={setup.date} onChange={(event) => updateSetup(setSetup, { date: event.target.value })} />
        </Field>
        <Field label="Time">
          <input
            type="time"
            value={setup.serviceTime}
            onChange={(event) => updateSetup(setSetup, { serviceTime: event.target.value })}
          />
        </Field>
      </section>

      <div className="restaurant-grid">
        <section className="panel reservations-panel" aria-labelledby="reservations-heading">
          <PanelHeader
            icon={<CalendarDays size={18} />}
            title="Daily reservations"
            action={
              <button
                type="button"
                className="icon-button"
                onClick={() => reservationsQuery.refetch()}
                disabled={!hasRestaurantContext || reservationsQuery.isFetching}
                aria-label="Refresh reservations"
              >
                <RefreshCw size={16} className={reservationsQuery.isFetching ? 'spin' : undefined} />
              </button>
            }
          />

          {!hasRestaurantContext && <EmptyState icon={<DoorOpen size={22} />} title="Branch context required" />}
          {reservationsQuery.isError && <InlineError error={reservationsQuery.error} />}
          {reservationsQuery.isPending && hasRestaurantContext && <SkeletonRows count={4} />}
          {reservationsQuery.data?.length === 0 && <EmptyState icon={<Clock3 size={22} />} title="No reservations" />}
          {reservationsQuery.data?.map((reservation) => (
            <ReservationCard
              key={reservation.reservationId}
              reservation={reservation}
              actionReason={actionReason}
              onReasonChange={setActionReason}
              isMutating={statusMutation.isPending || cancelMutation.isPending}
              onStatus={(status) =>
                statusMutation.mutate({
                  reservationId: reservation.reservationId,
                  status,
                  reason: optionalText(actionReason),
                })
              }
              onCancel={() =>
                cancelMutation.mutate({
                  reservationId: reservation.reservationId,
                  reason: optionalText(actionReason),
                })
              }
            />
          ))}
        </section>

        <section className="panel booking-panel" aria-labelledby="booking-heading">
          <PanelHeader icon={<Search size={18} />} title="Availability" />
          <form className="booking-form" onSubmit={handleAvailabilitySearch}>
            <div className="form-row">
              <Field label="Party">
                <input
                  type="number"
                  min={1}
                  value={reservationForm.partySize}
                  onChange={(event) =>
                    setReservationForm((current) => ({ ...current, partySize: Number(event.target.value) }))
                  }
                />
              </Field>
              <Field label="Duration">
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={reservationForm.durationMinutes}
                  onChange={(event) =>
                    setReservationForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))
                  }
                />
              </Field>
            </div>
            <button type="submit" className="primary-button" disabled={!canSearchAvailability || availabilityMutation.isPending}>
              {availabilityMutation.isPending ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
              Search tables
            </button>
          </form>

          {availabilityResult && (
            <div className="availability-results">
              <div className="metric-strip">
                <Metric label="Open tables" value={availabilityResult.availableTables.length} />
                <Metric label="Rejected" value={availabilityResult.rejections.length} />
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
                        {table.minCapacity}-{table.maxCapacity} seats
                      </small>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form className="booking-form create-form" onSubmit={handleCreateReservation}>
            <Field label="Guest">
              <input
                value={reservationForm.customerFullName}
                onChange={(event) => setReservationForm((current) => ({ ...current, customerFullName: event.target.value }))}
              />
            </Field>
            <div className="form-row">
              <Field label="Phone">
                <input
                  value={reservationForm.customerPhone}
                  onChange={(event) => setReservationForm((current) => ({ ...current, customerPhone: event.target.value }))}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={reservationForm.customerEmail}
                  onChange={(event) => setReservationForm((current) => ({ ...current, customerEmail: event.target.value }))}
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                value={reservationForm.specialRequests}
                onChange={(event) => setReservationForm((current) => ({ ...current, specialRequests: event.target.value }))}
                rows={3}
              />
            </Field>
            <div className="selected-tables">
              <Utensils size={16} />
              <span>{selectedTableLabels || 'No table selected'}</span>
            </div>
            <button type="submit" className="primary-button" disabled={!canCreateReservation || createReservationMutation.isPending}>
              {createReservationMutation.isPending ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
              Create reservation
            </button>
          </form>
        </section>

        <section className="panel floor-panel" aria-labelledby="floor-heading">
          <PanelHeader icon={<MapIcon size={18} />} title="Floor status" />
          <div className="floor-controls">
            <select
              value={setup.floorPlanId}
              onChange={(event) => updateSetup(setSetup, { floorPlanId: event.target.value })}
              disabled={!floorPlansQuery.data?.length}
            >
              <option value="">Select floor plan</option>
              {floorPlansQuery.data?.map((floorPlan) => (
                <option key={floorPlan.id} value={floorPlan.id}>
                  {floorPlan.name}
                </option>
              ))}
            </select>
            <input
              value={setup.floorPlanId}
              onChange={(event) => updateSetup(setSetup, { floorPlanId: event.target.value })}
              placeholder="Floor plan ID"
            />
          </div>
          {floorPlansQuery.isError && <InlineError error={floorPlansQuery.error} />}
          {floorPlanQuery.isPending && setup.floorPlanId && <SkeletonRows count={3} />}
          {floorPlanQuery.data && (
            <FloorPlanCanvas
              floorPlan={floorPlanQuery.data}
              statuses={statusMapQuery.data?.tables ?? []}
              isFetchingStatus={statusMapQuery.isFetching}
            />
          )}
          {!setup.floorPlanId && <EmptyState icon={<MapIcon size={22} />} title="No floor plan selected" />}
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function PanelHeader({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) {
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="empty-state">
      {icon}
      <span>{title}</span>
    </div>
  );
}

function InlineError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Request failed';
  return (
    <div className="inline-error" role="alert">
      <CircleAlert size={17} />
      <span>{message}</span>
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="skeleton-list" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function ReservationCard({
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
          <span>{reservation.tables.map((table) => table.label).join(', ') || 'Unassigned'}</span>
        </div>
        <StatusBadge status={reservation.status} />
      </div>
      <dl className="reservation-facts">
        <div>
          <dt>Time</dt>
          <dd>
            {formatTime(reservation.startAt)}-{formatTime(reservation.endAt)}
          </dd>
        </div>
        <div>
          <dt>Party</dt>
          <dd>{reservation.partySize}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{sourceLabel(reservation.source)}</dd>
        </div>
      </dl>
      {reservation.specialRequests && <p className="reservation-note">{reservation.specialRequests}</p>}
      {transitions.length > 0 && (
        <div className="reservation-actions">
          <input value={actionReason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Reason" />
          {transitions.map((status) =>
            status === RestaurantReservationStatus.Cancelled ? (
              <button key={status} type="button" className="danger-button" onClick={onCancel} disabled={isMutating}>
                <X size={15} />
                Cancel
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

function FloorPlanCanvas({
  floorPlan,
  statuses,
  isFetchingStatus,
}: {
  floorPlan: RestaurantFloorPlanDetail;
  statuses: RestaurantTableStatusDetail[];
  isFetchingStatus: boolean;
}) {
  const statusByTable = new Map(statuses.map((status) => [status.tableId, status]));
  return (
    <div className="floor-wrap">
      {isFetchingStatus && (
        <span className="floor-refresh">
          <Loader2 size={14} className="spin" /> Syncing
        </span>
      )}
      <div className="floor-canvas" style={{ aspectRatio: `${floorPlan.canvasWidth} / ${floorPlan.canvasHeight}` }}>
        {floorPlan.areaLayouts.map((area) => (
          <div
            key={area.areaId}
            className="floor-area"
            style={layoutStyle(area, floorPlan.canvasWidth, floorPlan.canvasHeight)}
          >
            {area.areaName}
          </div>
        ))}
        {floorPlan.tableLayouts.map((table) => {
          const tableStatus = statusByTable.get(table.tableId);
          return (
            <div
              key={table.tableId}
              className="floor-table"
              data-status={visualStatusLabel(tableStatus?.status ?? RestaurantTableVisualStatus.Available).toLowerCase()}
              data-shape={shapeToken(table.shape)}
              style={layoutStyle(table, floorPlan.canvasWidth, floorPlan.canvasHeight)}
              title={tableStatus?.reason ?? table.tableLabel}
            >
              <strong>{table.tableLabel}</strong>
              <small>{visualStatusLabel(tableStatus?.status ?? RestaurantTableVisualStatus.Available)}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function useStoredSetup(): [RestaurantSetup, Dispatch<SetStateAction<RestaurantSetup>>] {
  const [setup, setSetup] = useState<RestaurantSetup>(() => {
    const stored = window.localStorage.getItem(setupStorageKey);
    if (!stored) {
      return defaultSetup;
    }

    try {
      return { ...defaultSetup, ...(JSON.parse(stored) as Partial<RestaurantSetup>) };
    } catch {
      return defaultSetup;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(setupStorageKey, JSON.stringify(setup));
  }, [setup]);

  return [setup, setSetup];
}

function updateSetup(setSetup: Dispatch<SetStateAction<RestaurantSetup>>, patch: Partial<RestaurantSetup>) {
  setSetup((current) => ({ ...current, ...patch }));
}

function layoutStyle(
  item: { x: number; y: number; width: number; height: number; rotationDegrees: number },
  canvasWidth: number,
  canvasHeight: number,
) {
  return {
    left: `${(item.x / canvasWidth) * 100}%`,
    top: `${(item.y / canvasHeight) * 100}%`,
    width: `${(item.width / canvasWidth) * 100}%`,
    height: `${(item.height / canvasHeight) * 100}%`,
    transform: `rotate(${item.rotationDegrees}deg)`,
  };
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

function statusLabel(status: RestaurantReservationStatus) {
  switch (status) {
    case RestaurantReservationStatus.Pending:
      return 'Pending';
    case RestaurantReservationStatus.Confirmed:
      return 'Confirmed';
    case RestaurantReservationStatus.Seated:
      return 'Seated';
    case RestaurantReservationStatus.Completed:
      return 'Completed';
    case RestaurantReservationStatus.Cancelled:
      return 'Cancelled';
    case RestaurantReservationStatus.NoShow:
      return 'No Show';
  }
}

function sourceLabel(source: RestaurantReservationSource) {
  switch (source) {
    case RestaurantReservationSource.Phone:
      return 'Phone';
    case RestaurantReservationSource.WalkIn:
      return 'Walk In';
    case RestaurantReservationSource.Website:
      return 'Website';
    case RestaurantReservationSource.Staff:
      return 'Staff';
    case RestaurantReservationSource.Partner:
      return 'Partner';
    case RestaurantReservationSource.Other:
      return 'Other';
  }
}

function visualStatusLabel(status: RestaurantTableVisualStatus) {
  switch (status) {
    case RestaurantTableVisualStatus.Inactive:
      return 'Inactive';
    case RestaurantTableVisualStatus.Blocked:
      return 'Blocked';
    case RestaurantTableVisualStatus.Occupied:
      return 'Occupied';
    case RestaurantTableVisualStatus.Reserved:
      return 'Reserved';
    case RestaurantTableVisualStatus.Cleaning:
      return 'Cleaning';
    case RestaurantTableVisualStatus.Available:
      return 'Available';
  }
}

function statusToken(status: RestaurantReservationStatus) {
  return statusLabel(status).replace(/\s/g, '').toLowerCase();
}

function shapeToken(shape: RestaurantTableShape) {
  switch (shape) {
    case RestaurantTableShape.Round:
      return 'round';
    case RestaurantTableShape.Square:
      return 'square';
    case RestaurantTableShape.Rectangle:
      return 'rectangle';
    case RestaurantTableShape.Booth:
      return 'booth';
    case RestaurantTableShape.Bar:
      return 'bar';
    case RestaurantTableShape.Custom:
      return 'custom';
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time || '00:00'}:00`).toISOString();
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function invalidateRestaurantWork(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'reservations'] }),
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'availability'] }),
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'floor-plan-status-map'] }),
  ]);
}

function showMutationError(error: unknown, title: string) {
  if (error instanceof RestaurantApiError) {
    toast.error(title, { description: error.message });
    return;
  }

  toast.error(title);
}
