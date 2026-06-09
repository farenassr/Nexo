import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Activity, CalendarPlus, Loader2, Map as MapIcon, Utensils } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  cancelRestaurantReservation,
  createRestaurantReservation,
  createRestaurantTableBlock,
  getRestaurantContext,
  getRestaurantFloorPlan,
  getRestaurantFloorPlanStatusMap,
  listRestaurantFloorPlans,
  listRestaurantTableReservations,
  RestaurantApiError,
  searchRestaurantAvailability,
  updateRestaurantReservationStatus,
  type CreateRestaurantReservationInput,
} from '../api/restaurantApi';
import { FloorPlanCanvas } from '../components/FloorPlanCanvas';
import { ReservationCreatePanel } from '../components/ReservationCreatePanel';
import { FloorPlanLiveToolbar } from '../components/live/FloorPlanLiveToolbar';
import { TableDetailsSidePanel } from '../components/live/TableDetailsSidePanel';
import { TableStatusLegend } from '../components/live/TableStatusLegend';
import { EmptyState, InlineError, PanelHeader, SkeletonRows } from '../components/restaurantUi';
import { findActionReservation, getTableActionState } from '../liveViewState';
import labels from '../labels.es.json';
import { restaurantQueryKeys } from '../queryKeys';
import {
  combineDateAndTime,
  defaultReservationForm,
  optionalText,
  storeSelectedTableId,
  updateSetup,
  useStoredSetup,
} from '../state/restaurantWorkspaceState';
import { RestaurantReservationSource, RestaurantReservationStatus, type RestaurantAvailabilitySearchResult } from '../types';

export function RestaurantFloorPlanLivePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [setup, setSetup] = useStoredSetup();
  const [reservationForm, setReservationForm] = useState(defaultReservationForm);
  const [availabilityResult, setAvailabilityResult] = useState<RestaurantAvailabilitySearchResult | null>(null);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');

  const serviceInstant = useMemo(() => combineDateAndTime(setup.date, setup.serviceTime), [setup.date, setup.serviceTime]);
  const blockEndAt = useMemo(() => {
    const endAt = new Date(serviceInstant);
    endAt.setMinutes(endAt.getMinutes() + (reservationForm.durationMinutes || 90));
    return endAt.toISOString();
  }, [reservationForm.durationMinutes, serviceInstant]);
  const hasRestaurantContext = setup.branchId.trim().length > 0;
  const hasFloorContext = setup.branchId.trim().length > 0 && setup.floorId.trim().length > 0;

  const contextQuery = useQuery({
    queryKey: restaurantQueryKeys.context(),
    queryFn: getRestaurantContext,
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
      setSelectedTableId(null);
      return;
    }

    setSelectedTableId((current) =>
      current && floorPlanQuery.data.tableLayouts.some((table) => table.tableId === current)
        ? current
        : floorPlanQuery.data.tableLayouts[0]?.tableId ?? null,
    );
  }, [floorPlanQuery.data]);

  const floorPlan = floorPlanQuery.data ?? null;
  const statusByTable = useMemo(
    () => new Map(statusMapQuery.data?.tables.map((status) => [status.tableId, status]) ?? []),
    [statusMapQuery.data],
  );
  const selectedTable = floorPlan?.tableLayouts.find((table) => table.tableId === selectedTableId) ?? null;
  const selectedStatus = selectedTableId ? statusByTable.get(selectedTableId) ?? null : null;
  const selectedTableReservations = selectedTableReservationsQuery.data ?? [];
  const actionReservation = findActionReservation(selectedTableReservations);
  const actionState = getTableActionState(selectedStatus, selectedTableReservations);
  const visibleTables = floorPlan?.tableLayouts.filter((table) => !setup.areaId || table.areaId === setup.areaId) ?? [];

  const availabilityMutation = useMutation({
    mutationFn: searchRestaurantAvailability,
    onSuccess: (result) => {
      setAvailabilityResult(result);
      const firstOption = result.availableTables[0];
      setSelectedTableIds(firstOption ? [firstOption.tableId] : selectedTableId ? [selectedTableId] : []);
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

  const blockMutation = useMutation({
    mutationFn: createRestaurantTableBlock,
    onSuccess: async () => {
      toast.success(labels.toasts.blockCreated);
      setActionReason('');
      await invalidateRestaurantWork(queryClient);
    },
    onError: (error) => showMutationError(error, labels.toasts.blockFailed),
  });

  const selectedTableLabels = selectedTableIds
    .map((tableId) => availabilityResult?.availableTables.find((table) => table.tableId === tableId)?.label ?? tableId)
    .join(', ');
  const canSearchAvailability = hasRestaurantContext && reservationForm.partySize > 0 && Boolean(setup.date && setup.serviceTime);
  const canCreateReservation =
    canSearchAvailability && selectedTableIds.length > 0 && reservationForm.customerFullName.trim().length > 0;

  function handleSelectTable(tableId: string) {
    setSelectedTableId(tableId);
  }

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

  function handleStartReservationForSelectedTable() {
    if (!selectedTable) {
      return;
    }

    setSelectedTableIds([selectedTable.tableId]);
    setAvailabilityResult({
      availableTables: [
        {
          tableId: selectedTable.tableId,
          label: selectedTable.tableLabel,
          minCapacity: reservationForm.partySize,
          maxCapacity: reservationForm.partySize,
          startAt: serviceInstant,
          endAt: blockEndAt,
        },
      ],
      rejections: [],
    });
  }

  function handleBlockSelectedTable() {
    if (!selectedTable) {
      return;
    }

    blockMutation.mutate({
      branchId: setup.branchId,
      floorId: setup.floorId || null,
      areaId: selectedTable.areaId,
      tableId: selectedTable.tableId,
      startAt: serviceInstant,
      endAt: blockEndAt,
      reason: optionalText(actionReason),
    });
  }

  function handleStatus(status: RestaurantReservationStatus) {
    if (!actionReservation) {
      return;
    }

    statusMutation.mutate({
      reservationId: actionReservation.reservationId,
      status,
      reason: optionalText(actionReason),
    });
  }

  function handleCancel() {
    if (!actionReservation) {
      return;
    }

    cancelMutation.mutate({
      reservationId: actionReservation.reservationId,
      reason: optionalText(actionReason),
    });
  }

  function handleEditTable() {
    if (selectedTableId) {
      storeSelectedTableId(selectedTableId);
    }

    void navigate({ to: '/restaurant/floor-plan-editor' as never });
  }

  return (
    <main className="restaurant-page">
      <header className="restaurant-topbar">
        <div>
          <span className="eyebrow">{labels.app.eyebrow}</span>
          <h1>{labels.sections.floor}</h1>
        </div>
        <div className="topbar-actions">
          <div className="context-pill" data-state={contextQuery.isError ? 'error' : 'ready'}>
            {contextQuery.isPending ? <Loader2 className="spin" size={16} /> : <Activity size={16} />}
            <span>{contextQuery.data?.moduleKey ?? (contextQuery.isError ? labels.app.contextBlocked : labels.app.contextFallback)}</span>
          </div>
        </div>
      </header>

      <FloorPlanLiveToolbar
        setup={setup}
        setSetup={setSetup}
        floorPlans={floorPlansQuery.data}
        areas={floorPlan?.areaLayouts ?? []}
        isRefreshDisabled={!setup.floorPlanId}
        isRefreshing={statusMapQuery.isFetching}
        onRefresh={() => void statusMapQuery.refetch()}
      />

      <div className="operations-grid live-operations-grid">
        <section className="panel floor-command-panel" aria-labelledby="floor-heading">
          <PanelHeader icon={<MapIcon size={18} />} title={labels.sections.floor} />
          <TableStatusLegend />
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
              isEditingLayout={false}
              isFetchingStatus={statusMapQuery.isFetching}
              showQuickTooltip
              onSelectTable={handleSelectTable}
              onBeginDrag={() => undefined}
              onMoveDrag={() => undefined}
              onEndDrag={() => undefined}
            />
          )}
          {!setup.floorPlanId && <EmptyState icon={<MapIcon size={22} />} title={labels.states.floorPlanRequired} />}
        </section>

        <aside className="side-stack">
          <section className="panel selected-table-panel" aria-labelledby="selected-table-heading">
            <PanelHeader icon={<Utensils size={18} />} title={labels.sections.selectedTable} />
            <TableDetailsSidePanel
              table={selectedTable}
              status={selectedStatus}
              reservations={selectedTableReservations}
              serviceInstant={serviceInstant}
              actionReason={actionReason}
              actionState={actionState}
              isMutating={statusMutation.isPending || cancelMutation.isPending}
              isBlocking={blockMutation.isPending}
              isLoadingReservations={selectedTableReservationsQuery.isPending}
              reservationsError={selectedTableReservationsQuery.error}
              onReasonChange={setActionReason}
              onCreateReservation={handleStartReservationForSelectedTable}
              onBlockTable={handleBlockSelectedTable}
              onMarkSeated={() => handleStatus(RestaurantReservationStatus.Seated)}
              onMarkCompleted={() => handleStatus(RestaurantReservationStatus.Completed)}
              onCancelReservation={handleCancel}
              onEditTable={handleEditTable}
            />
          </section>

          <section className="panel booking-panel" aria-labelledby="booking-heading">
            <PanelHeader icon={<CalendarPlus size={18} />} title={labels.sections.booking} />
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
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'table-blocks'] }),
  ]);
}

function showMutationError(error: unknown, title: string) {
  if (error instanceof RestaurantApiError) {
    toast.error(title, { description: error.message });
    return;
  }

  toast.error(title);
}
