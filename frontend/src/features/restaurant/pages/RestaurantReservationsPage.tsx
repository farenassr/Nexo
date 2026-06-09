import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  Activity,
  CalendarDays,
  Grip,
  Loader2,
  Map as MapIcon,
  Move,
  RefreshCw,
  Save,
  Search,
  Utensils,
} from 'lucide-react';
import { type FormEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
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
import { DailyReservationList } from '../components/DailyReservationList';
import { FloorPlanCanvas, StatusLegend } from '../components/FloorPlanCanvas';
import { ReservationCreatePanel } from '../components/ReservationCreatePanel';
import { SelectedTablePanel } from '../components/SelectedTablePanel';
import { EmptyState, Field, InlineError, PanelHeader, SkeletonRows } from '../components/restaurantUi';
import { moveTableLayout, replaceTableLayout, toSaveFloorPlanInput } from '../floorPlanEditor';
import labels from '../labels.es.json';
import { restaurantQueryKeys } from '../queryKeys';
import {
  combineDateAndTime,
  defaultReservationForm,
  optionalText,
  updateSetup,
  useStoredSetup,
  type DragState,
} from '../state/restaurantWorkspaceState';
import {
  RestaurantReservationSource,
  type RestaurantAvailabilitySearchResult,
  type RestaurantFloorPlanDetail,
  type RestaurantTableLayoutDetail,
} from '../types';

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
        throw new Error(labels.states.floorPlanRequired);
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

      <section className="setup-panel" aria-label={labels.app.contextFallback}>
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
          {floorPlansQuery.isError && <InlineError error={floorPlansQuery.error} />}
          {floorPlanQuery.isError && <InlineError error={floorPlanQuery.error} />}
          {statusMapQuery.isError && <InlineError error={statusMapQuery.error} />}
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
                reservationsError={selectedTableReservationsQuery.error}
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
            <ReservationCreatePanel
              reservationForm={reservationForm}
              availabilityResult={availabilityResult}
              selectedTableIds={selectedTableIds}
              selectedTableLabels={selectedTableLabels}
              canSearchAvailability={canSearchAvailability}
              canCreateReservation={canCreateReservation}
              isSearchingAvailability={availabilityMutation.isPending}
              isCreatingReservation={createReservationMutation.isPending}
              setReservationForm={setReservationForm}
              setSelectedTableIds={setSelectedTableIds}
              onAvailabilitySearch={handleAvailabilitySearch}
              onCreateReservation={handleCreateReservation}
            />
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

          <DailyReservationList
            hasRestaurantContext={hasRestaurantContext}
            reservations={reservationsQuery.data}
            actionReason={actionReason}
            isError={reservationsQuery.isError}
            error={reservationsQuery.error}
            isPending={reservationsQuery.isPending}
            isMutating={statusMutation.isPending || cancelMutation.isPending}
            onReasonChange={setActionReason}
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
          />
        </section>
      </div>
    </main>
  );
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
