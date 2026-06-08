import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  Activity,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  DoorOpen,
  Grip,
  Loader2,
  Map as MapIcon,
  Move,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Utensils,
  X,
} from 'lucide-react';
import {
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  cancelRestaurantReservation,
  createRestaurantReservation,
  getRestaurantContext,
  getRestaurantFloorPlan,
  getRestaurantFloorPlanStatusMap,
  listRestaurantFloorPlans,
  listRestaurantReservations,
  listRestaurantTableReservations,
  RestaurantApiError,
  saveRestaurantFloorPlan,
  searchRestaurantAvailability,
  updateRestaurantReservationStatus,
  type CreateRestaurantReservationInput,
} from '../api/restaurantApi';
import { moveTableLayout, replaceTableLayout, toSaveFloorPlanInput } from '../floorPlanEditor';
import labels from '../labels.es.json';
import { restaurantQueryKeys } from '../queryKeys';
import {
  RestaurantReservationSource,
  RestaurantReservationStatus,
  RestaurantTableShape,
  RestaurantTableVisualStatus,
  type RestaurantAvailabilitySearchResult,
  type RestaurantFloorPlanDetail,
  type RestaurantReservationDetail,
  type RestaurantTableLayoutDetail,
  type RestaurantTableStatusDetail,
} from '../types';

interface RestaurantSetup {
  branchId: string;
  floorId: string;
  floorPlanId: string;
  areaId: string;
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

interface DragState {
  tableId: string;
  startClientX: number;
  startClientY: number;
}

const setupStorageKey = 'nexo.restaurant.setup';
const defaultSetup: RestaurantSetup = {
  branchId: '',
  floorId: '',
  floorPlanId: '',
  areaId: '',
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
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [setup, setSetup] = useStoredSetup();
  const [reservationForm, setReservationForm] = useState(defaultReservationForm);
  const [availabilityResult, setAvailabilityResult] = useState<RestaurantAvailabilitySearchResult | null>(null);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [draftFloorPlan, setDraftFloorPlan] = useState<RestaurantFloorPlanDetail | null>(null);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [hasLayoutChanges, setHasLayoutChanges] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);

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
    queryKey: restaurantQueryKeys.statusMap(setup.floorPlanId, serviceInstant, optionalText(setup.areaId)),
    queryFn: () => getRestaurantFloorPlanStatusMap(setup.floorPlanId, serviceInstant, optionalText(setup.areaId)),
    enabled: setup.floorPlanId.trim().length > 0,
  });

  const selectedTableReservationsQuery = useQuery({
    queryKey: restaurantQueryKeys.tableReservations(selectedTableId ?? '', setup.date),
    queryFn: () => listRestaurantTableReservations(selectedTableId!, setup.date),
    enabled: Boolean(selectedTableId),
  });

  useEffect(() => {
    if (!floorPlanQuery.data) {
      setDraftFloorPlan(null);
      setSelectedTableId(null);
      return;
    }

    setDraftFloorPlan(floorPlanQuery.data);
    setHasLayoutChanges(false);
    setSelectedTableId((current) =>
      current && floorPlanQuery.data.tableLayouts.some((table) => table.tableId === current)
        ? current
        : floorPlanQuery.data.tableLayouts[0]?.tableId ?? null,
    );
  }, [floorPlanQuery.data]);

  const floorPlan = draftFloorPlan ?? floorPlanQuery.data ?? null;
  const statusByTable = useMemo(
    () => new Map(statusMapQuery.data?.tables.map((status) => [status.tableId, status]) ?? []),
    [statusMapQuery.data],
  );
  const selectedTable = floorPlan?.tableLayouts.find((table) => table.tableId === selectedTableId) ?? null;
  const selectedStatus = selectedTableId ? statusByTable.get(selectedTableId) ?? null : null;
  const selectedTableReservations = selectedTableReservationsQuery.data ?? [];
  const visibleTables = floorPlan?.tableLayouts.filter((table) => !setup.areaId || table.areaId === setup.areaId) ?? [];

  const availabilityMutation = useMutation({
    mutationFn: searchRestaurantAvailability,
    onSuccess: (result) => {
      setAvailabilityResult(result);
      const firstOption = result.availableTables[0];
      setSelectedTableIds(firstOption ? [firstOption.tableId] : []);
    },
    onError: (error) => showMutationError(error, labels.toasts.availabilityFailed),
  });

  const createReservationMutation = useMutation({
    mutationFn: createRestaurantReservation,
    onSuccess: async () => {
      toast.success(labels.toasts.created);
      setReservationForm(defaultReservationForm);
      setAvailabilityResult(null);
      setSelectedTableIds([]);
      await invalidateRestaurantWork(queryClient);
    },
    onError: (error) => showMutationError(error, labels.toasts.createFailed),
  });

  const statusMutation = useMutation({
    mutationFn: updateRestaurantReservationStatus,
    onSuccess: async () => {
      toast.success(labels.toasts.statusUpdated);
      setActionReason('');
      await invalidateRestaurantWork(queryClient);
    },
    onError: (error) => showMutationError(error, labels.toasts.statusFailed),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ reservationId, reason }: { reservationId: string; reason: string | null }) =>
      cancelRestaurantReservation(reservationId, reason),
    onSuccess: async () => {
      toast.success(labels.toasts.cancelled);
      setActionReason('');
      await invalidateRestaurantWork(queryClient);
    },
    onError: (error) => showMutationError(error, labels.toasts.cancelFailed),
  });

  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      if (!draftFloorPlan) {
        throw new Error('No floor plan selected.');
      }

      return saveRestaurantFloorPlan(draftFloorPlan.id, toSaveFloorPlanInput(draftFloorPlan));
    },
    onSuccess: async (floorPlanDetail) => {
      toast.success(labels.toasts.layoutSaved);
      setDraftFloorPlan(floorPlanDetail);
      setHasLayoutChanges(false);
      await invalidateRestaurantWork(queryClient);
      await queryClient.invalidateQueries({ queryKey: restaurantQueryKeys.floorPlan(floorPlanDetail.id) });
    },
    onError: (error) => showMutationError(error, labels.toasts.layoutFailed),
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

  function beginTableDrag(event: ReactPointerEvent<HTMLButtonElement>, tableId: string) {
    if (!isEditingLayout || !floorPlan) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedTableId(tableId);
    setDragState({ tableId, startClientX: event.clientX, startClientY: event.clientY });
  }

  function moveTableDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragState || !draftFloorPlan || !canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((event.clientX - dragState.startClientX) / rect.width) * draftFloorPlan.canvasWidth;
    const deltaY = ((event.clientY - dragState.startClientY) / rect.height) * draftFloorPlan.canvasHeight;
    setDraftFloorPlan(moveTableLayout(draftFloorPlan, dragState.tableId, deltaX, deltaY));
    setDragState({ ...dragState, startClientX: event.clientX, startClientY: event.clientY });
    setHasLayoutChanges(true);
  }

  function endTableDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragState) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragState(null);
  }

  function patchSelectedTable(patch: Partial<RestaurantTableLayoutDetail>) {
    if (!draftFloorPlan || !selectedTable) {
      return;
    }

    setDraftFloorPlan(replaceTableLayout(draftFloorPlan, { ...selectedTable, ...patch }));
    setHasLayoutChanges(true);
  }

  return (
    <main className="restaurant-page">
      <header className="restaurant-topbar">
        <div>
          <span className="eyebrow">{labels.app.eyebrow}</span>
          <h1>{labels.app.title}</h1>
        </div>
        <div className="topbar-actions">
          {hasLayoutChanges && <span className="dirty-pill">{labels.states.dirty}</span>}
          <button
            type="button"
            className="secondary-button"
            aria-pressed={isEditingLayout}
            onClick={() => setIsEditingLayout((current) => !current)}
          >
            {isEditingLayout ? <MapIcon size={16} /> : <Move size={16} />}
            {isEditingLayout ? labels.actions.live : labels.actions.edit}
          </button>
          <button
            type="button"
            className="primary-button compact-button"
            disabled={!hasLayoutChanges || saveLayoutMutation.isPending}
            onClick={() => saveLayoutMutation.mutate()}
          >
            {saveLayoutMutation.isPending ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
            {labels.actions.saveLayout}
          </button>
          <div className="context-pill" data-state={contextQuery.isError ? 'error' : 'ready'}>
            {contextQuery.isPending ? <Loader2 className="spin" size={16} /> : <Activity size={16} />}
            <span>{contextQuery.data?.moduleKey ?? (contextQuery.isError ? labels.app.contextBlocked : labels.app.contextFallback)}</span>
          </div>
        </div>
      </header>

      <section className="setup-panel" aria-label="Restaurant setup">
        <Field label={labels.setup.branchId}>
          <input
            value={setup.branchId}
            onChange={(event) => updateSetup(setSetup, { branchId: event.target.value })}
            placeholder="00000000-0000-7000-8000-000000000101"
          />
        </Field>
        <Field label={labels.setup.floorId}>
          <input
            value={setup.floorId}
            onChange={(event) => updateSetup(setSetup, { floorId: event.target.value, floorPlanId: '', areaId: '' })}
            placeholder="00000000-0000-7000-8000-000000000201"
          />
        </Field>
        <Field label={labels.setup.floorPlan}>
          <select
            value={setup.floorPlanId}
            onChange={(event) => updateSetup(setSetup, { floorPlanId: event.target.value, areaId: '' })}
            disabled={!floorPlansQuery.data?.length}
          >
            <option value="">{labels.states.floorPlanRequired}</option>
            {floorPlansQuery.data?.map((floorPlanSummary) => (
              <option key={floorPlanSummary.id} value={floorPlanSummary.id}>
                {floorPlanSummary.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={labels.setup.areaFilter}>
          <select value={setup.areaId} onChange={(event) => updateSetup(setSetup, { areaId: event.target.value })}>
            <option value="">{labels.setup.allAreas}</option>
            {floorPlan?.areaLayouts.map((area) => (
              <option key={area.areaId} value={area.areaId}>
                {area.areaName}
              </option>
            ))}
          </select>
        </Field>
        <Field label={labels.setup.date}>
          <input type="date" value={setup.date} onChange={(event) => updateSetup(setSetup, { date: event.target.value })} />
        </Field>
        <Field label={labels.setup.time}>
          <input
            type="time"
            value={setup.serviceTime}
            onChange={(event) => updateSetup(setSetup, { serviceTime: event.target.value })}
          />
        </Field>
      </section>

      <div className="operations-grid">
        <section className="panel floor-command-panel" aria-labelledby="floor-heading">
          <PanelHeader
            icon={<MapIcon size={18} />}
            title={labels.sections.floor}
            action={
              <button
                type="button"
                className="icon-button"
                onClick={() => statusMapQuery.refetch()}
                disabled={!setup.floorPlanId || statusMapQuery.isFetching}
                aria-label={labels.actions.refresh}
              >
                <RefreshCw size={16} className={statusMapQuery.isFetching ? 'spin' : undefined} />
              </button>
            }
          />
          <StatusLegend />
          {floorPlanQuery.isError && <InlineError error={floorPlanQuery.error} />}
          {floorPlanQuery.isPending && setup.floorPlanId && <SkeletonRows count={3} />}
          {floorPlan && (
            <FloorPlanCanvas
              canvasRef={canvasRef}
              floorPlan={floorPlan}
              tables={visibleTables}
              statuses={statusByTable}
              selectedTableId={selectedTableId}
              isEditingLayout={isEditingLayout}
              isFetchingStatus={statusMapQuery.isFetching}
              onSelectTable={setSelectedTableId}
              onBeginDrag={beginTableDrag}
              onMoveDrag={moveTableDrag}
              onEndDrag={endTableDrag}
            />
          )}
          {!setup.floorPlanId && <EmptyState icon={<MapIcon size={22} />} title={labels.states.floorPlanRequired} />}
        </section>

        <aside className="side-stack">
          <section className="panel selected-table-panel" aria-labelledby="selected-table-heading">
            <PanelHeader icon={<Utensils size={18} />} title={labels.sections.selectedTable} />
            {selectedTable ? (
              <SelectedTablePanel
                table={selectedTable}
                status={selectedStatus}
                reservations={selectedTableReservations}
                actionReason={actionReason}
                onReasonChange={setActionReason}
                isMutating={statusMutation.isPending || cancelMutation.isPending}
                isLoadingReservations={selectedTableReservationsQuery.isPending}
                isEditingLayout={isEditingLayout}
                onStatus={(reservationId, status) =>
                  statusMutation.mutate({
                    reservationId,
                    status,
                    reason: optionalText(actionReason),
                  })
                }
                onCancel={(reservationId) =>
                  cancelMutation.mutate({
                    reservationId,
                    reason: optionalText(actionReason),
                  })
                }
                onPatchTable={patchSelectedTable}
              />
            ) : (
              <EmptyState icon={<Grip size={22} />} title={labels.states.noTableSelected} />
            )}
          </section>

          <section className="panel booking-panel" aria-labelledby="booking-heading">
            <PanelHeader icon={<Search size={18} />} title={labels.sections.booking} />
            <form className="booking-form" onSubmit={handleAvailabilitySearch}>
              <div className="form-row">
                <Field label={labels.fields.party}>
                  <input
                    type="number"
                    min={1}
                    value={reservationForm.partySize}
                    onChange={(event) =>
                      setReservationForm((current) => ({ ...current, partySize: Number(event.target.value) }))
                    }
                  />
                </Field>
                <Field label={labels.fields.duration}>
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
                {labels.actions.search}
              </button>
            </form>

            {availabilityResult && (
              <div className="availability-results">
                <div className="metric-strip">
                  <Metric label={labels.status.available} value={availabilityResult.availableTables.length} />
                  <Metric label="Rechazadas" value={availabilityResult.rejections.length} />
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

            <form className="booking-form create-form" onSubmit={handleCreateReservation}>
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
              <button type="submit" className="primary-button" disabled={!canCreateReservation || createReservationMutation.isPending}>
                {createReservationMutation.isPending ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
                {labels.actions.create}
              </button>
            </form>
          </section>
        </aside>

        <section className="panel reservations-panel" aria-labelledby="reservations-heading">
          <PanelHeader
            icon={<CalendarDays size={18} />}
            title={labels.sections.reservations}
            action={
              <button
                type="button"
                className="icon-button"
                onClick={() => reservationsQuery.refetch()}
                disabled={!hasRestaurantContext || reservationsQuery.isFetching}
                aria-label={labels.actions.refresh}
              >
                <RefreshCw size={16} className={reservationsQuery.isFetching ? 'spin' : undefined} />
              </button>
            }
          />

          {!hasRestaurantContext && <EmptyState icon={<DoorOpen size={22} />} title={labels.states.branchRequired} />}
          {reservationsQuery.isError && <InlineError error={reservationsQuery.error} />}
          {reservationsQuery.isPending && hasRestaurantContext && <SkeletonRows count={4} />}
          {reservationsQuery.data?.length === 0 && <EmptyState icon={<Clock3 size={22} />} title={labels.states.noReservations} />}
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

function StatusLegend() {
  const items = [
    [RestaurantTableVisualStatus.Available, labels.status.available],
    [RestaurantTableVisualStatus.Reserved, labels.status.reserved],
    [RestaurantTableVisualStatus.Occupied, labels.status.occupied],
    [RestaurantTableVisualStatus.Blocked, labels.status.blocked],
    [RestaurantTableVisualStatus.Cleaning, labels.status.cleaning],
    [RestaurantTableVisualStatus.Inactive, labels.status.inactive],
  ] as const;

  return (
    <div className="status-legend" aria-label="Status legend">
      {items.map(([status, label]) => (
        <span key={status} data-status={visualStatusToken(status)}>
          <i />
          {label}
        </span>
      ))}
    </div>
  );
}

function FloorPlanCanvas({
  canvasRef,
  floorPlan,
  tables,
  statuses,
  selectedTableId,
  isEditingLayout,
  isFetchingStatus,
  onSelectTable,
  onBeginDrag,
  onMoveDrag,
  onEndDrag,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  floorPlan: RestaurantFloorPlanDetail;
  tables: RestaurantTableLayoutDetail[];
  statuses: Map<string, RestaurantTableStatusDetail>;
  selectedTableId: string | null;
  isEditingLayout: boolean;
  isFetchingStatus: boolean;
  onSelectTable: (tableId: string) => void;
  onBeginDrag: (event: ReactPointerEvent<HTMLButtonElement>, tableId: string) => void;
  onMoveDrag: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onEndDrag: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="floor-wrap">
      {isFetchingStatus && (
        <span className="floor-refresh">
          <Loader2 size={14} className="spin" /> {labels.states.syncing}
        </span>
      )}
      <div ref={canvasRef} className="floor-canvas premium-canvas" style={{ aspectRatio: `${floorPlan.canvasWidth} / ${floorPlan.canvasHeight}` }}>
        {floorPlan.areaLayouts.map((area) => (
          <div
            key={area.areaId}
            className="floor-area"
            style={layoutStyle(area, floorPlan.canvasWidth, floorPlan.canvasHeight)}
          >
            {area.areaName}
          </div>
        ))}
        {tables.map((table) => {
          const tableStatus = statuses.get(table.tableId);
          const visualStatus = tableStatus?.status ?? RestaurantTableVisualStatus.Available;
          return (
            <button
              key={table.tableId}
              type="button"
              className="floor-table"
              data-status={visualStatusToken(visualStatus)}
              data-shape={shapeToken(table.shape)}
              data-selected={selectedTableId === table.tableId}
              data-editing={isEditingLayout}
              style={layoutStyle(table, floorPlan.canvasWidth, floorPlan.canvasHeight)}
              title={tableStatus?.reason ?? table.tableLabel}
              onClick={() => onSelectTable(table.tableId)}
              onPointerDown={(event) => onBeginDrag(event, table.tableId)}
              onPointerMove={onMoveDrag}
              onPointerUp={onEndDrag}
              onPointerCancel={onEndDrag}
            >
              <TableChairs table={table} />
              <strong>{table.tableLabel}</strong>
              <small>{visualStatusLabel(visualStatus)}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TableChairs({ table }: { table: RestaurantTableLayoutDetail }) {
  const seats = table.seatLayouts.length > 0 ? table.seatLayouts : defaultSeatLayouts(table.shape);
  return (
    <span className="chair-layer" aria-hidden="true">
      {seats.slice(0, 10).map((seat) => (
        <i
          key={seat.seatNumber}
          style={{
            left: `${seat.x}%`,
            top: `${seat.y}%`,
            transform: `rotate(${seat.rotationDegrees}deg)`,
          }}
        />
      ))}
    </span>
  );
}

function SelectedTablePanel({
  table,
  status,
  reservations,
  actionReason,
  onReasonChange,
  isMutating,
  isLoadingReservations,
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
          <Field label="Forma">
            <select
              value={table.shape}
              onChange={(event) => onPatchTable({ shape: Number(event.target.value) as RestaurantTableShape })}
            >
              <option value={RestaurantTableShape.Round}>Round</option>
              <option value={RestaurantTableShape.Square}>Square</option>
              <option value={RestaurantTableShape.Rectangle}>Rectangle</option>
              <option value={RestaurantTableShape.Booth}>Booth</option>
              <option value={RestaurantTableShape.Bar}>Bar</option>
            </select>
          </Field>
        </div>
      )}

      <div className="table-reservations">
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
          <dt>Hora</dt>
          <dd>
            {formatTime(reservation.startAt)}-{formatTime(reservation.endAt)}
          </dd>
        </div>
        <div>
          <dt>{labels.fields.party}</dt>
          <dd>{reservation.partySize}</dd>
        </div>
        <div>
          <dt>Origen</dt>
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
  item: { x: number; y: number; width: number; height: number; rotationDegrees: number; zIndex?: number },
  canvasWidth: number,
  canvasHeight: number,
): CSSProperties {
  return {
    left: `${(item.x / canvasWidth) * 100}%`,
    top: `${(item.y / canvasHeight) * 100}%`,
    width: `${(item.width / canvasWidth) * 100}%`,
    height: `${(item.height / canvasHeight) * 100}%`,
    transform: `rotate(${item.rotationDegrees}deg)`,
    zIndex: item.zIndex,
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

function visualStatusToken(status: RestaurantTableVisualStatus) {
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

function defaultSeatLayouts(shape: RestaurantTableShape) {
  if (shape === RestaurantTableShape.Round) {
    return [
      { seatNumber: 1, x: 50, y: -8, rotationDegrees: 0 },
      { seatNumber: 2, x: 96, y: 44, rotationDegrees: 90 },
      { seatNumber: 3, x: 50, y: 92, rotationDegrees: 180 },
      { seatNumber: 4, x: -8, y: 44, rotationDegrees: 270 },
    ];
  }

  return [
    { seatNumber: 1, x: 12, y: -8, rotationDegrees: 0 },
    { seatNumber: 2, x: 50, y: -8, rotationDegrees: 0 },
    { seatNumber: 3, x: 88, y: -8, rotationDegrees: 0 },
    { seatNumber: 4, x: 12, y: 92, rotationDegrees: 180 },
    { seatNumber: 5, x: 50, y: 92, rotationDegrees: 180 },
    { seatNumber: 6, x: 88, y: 92, rotationDegrees: 180 },
  ];
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
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'table-reservations'] }),
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'availability'] }),
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'floor-plan-status-map'] }),
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'floor-plan'] }),
  ]);
}

function showMutationError(error: unknown, title: string) {
  if (error instanceof RestaurantApiError) {
    toast.error(title, { description: error.message });
    return;
  }

  toast.error(title);
}
