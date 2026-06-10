import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CalendarPlus,
  Loader2,
  Map as MapIcon,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useNexoServerModulesRestaurantFeaturesFloorPlansGetDetailsGetRestaurantFloorPlanEndpoint,
  useNexoServerModulesRestaurantFeaturesFloorPlansListListRestaurantFloorPlansEndpoint,
  useNexoServerModulesRestaurantFeaturesFloorPlansStatusMapGetRestaurantFloorPlanStatusMapEndpoint,
  useNexoServerModulesRestaurantFeaturesGetContextRestaurantContextEndpoint,
  useNexoServerModulesRestaurantFeaturesReservationsCancelCancelRestaurantReservationEndpoint,
  useNexoServerModulesRestaurantFeaturesReservationsListByTableListRestaurantTableReservationsEndpoint,
  useNexoServerModulesRestaurantFeaturesReservationsUpdateStatusUpdateRestaurantReservationStatusEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupGetRestaurantSetupEndpoint,
  useNexoServerModulesRestaurantFeaturesTableBlocksCreateCreateRestaurantTableBlockEndpoint,
} from "../../../lib/api/generated/hooks";
import { invalidateRestaurantReservationWork } from "../api/restaurantQueryInvalidation";
import { FloorPlanCanvas } from "../components/FloorPlanCanvas";
import { FloorPlanLiveToolbar } from "../components/live/FloorPlanLiveToolbar";
import { TableDetailsSidePanel } from "../components/live/TableDetailsSidePanel";
import { TableStatusLegend } from "../components/live/TableStatusLegend";
import { CreateReservationModal } from "../components/reservations/CreateReservationModal";
import {
  EmptyState,
  InlineError,
  PanelHeader,
  SkeletonRows,
} from "../components/restaurantUi";
import { findActionReservation, getTableActionState } from "../liveViewState";
import labels from "../labels.es.json";
import {
  combineDateAndTime,
  isGuid,
  normalizeRestaurantSetupScope,
  optionalText,
  updateSetup,
  useRestaurantWorkspaceStore,
  useStoredSetup,
} from "../state/restaurantWorkspaceState";
import {
  RestaurantReservationStatus,
  type RestaurantAvailabilityTableOption,
} from "../types";

export function RestaurantFloorPlanLivePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [setup, setSetup] = useStoredSetup();
  const selectedTableId = useRestaurantWorkspaceStore(
    (state) => state.selectedTableId,
  );
  const setSelectedTableId = useRestaurantWorkspaceStore(
    (state) => state.setSelectedTableId,
  );
  const clearSelectedTableId = useRestaurantWorkspaceStore(
    (state) => state.clearSelectedTableId,
  );
  const [actionReason, setActionReason] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalInitialTable, setModalInitialTable] =
    useState<RestaurantAvailabilityTableOption | null>(null);

  const serviceInstant = useMemo(
    () => combineDateAndTime(setup.date, setup.serviceTime),
    [setup.date, setup.serviceTime],
  );
  const blockEndAt = useMemo(() => {
    const endAt = new Date(serviceInstant);
    endAt.setMinutes(endAt.getMinutes() + 90);
    return endAt.toISOString();
  }, [serviceInstant]);
  const hasFloorContext = isGuid(setup.branchId) && isGuid(setup.floorId);

  const contextQuery =
    useNexoServerModulesRestaurantFeaturesGetContextRestaurantContextEndpoint();

  const floorPlansQuery =
    useNexoServerModulesRestaurantFeaturesFloorPlansListListRestaurantFloorPlansEndpoint(
      { params: { branchId: setup.branchId, floorId: setup.floorId } },
      { query: { enabled: hasFloorContext } },
    );

  const setupQuery =
    useNexoServerModulesRestaurantFeaturesSetupGetRestaurantSetupEndpoint();

  const setupBranches = setupQuery.data?.branches ?? [];
  const setupFloors = useMemo(
    () =>
      setupQuery.data?.floors.filter(
        (floor) => floor.branchId === setup.branchId,
      ) ?? [],
    [setup.branchId, setupQuery.data],
  );

  useEffect(() => {
    if (!setupQuery.data) {
      return;
    }

    const normalized = normalizeRestaurantSetupScope(
      setup,
      setupQuery.data.branches,
      setupQuery.data.floors,
    );
    if (normalized !== setup) {
      setSetup(normalized);
    }
  }, [setSetup, setup, setupQuery.data]);

  useEffect(() => {
    const firstFloorPlanId = floorPlansQuery.data?.[0]?.id;
    if (!setup.floorPlanId && firstFloorPlanId) {
      updateSetup(setSetup, { floorPlanId: firstFloorPlanId });
    }
  }, [floorPlansQuery.data, setSetup, setup.floorPlanId]);

  const floorPlanQuery =
    useNexoServerModulesRestaurantFeaturesFloorPlansGetDetailsGetRestaurantFloorPlanEndpoint(
      { floorPlanId: setup.floorPlanId },
      { query: { enabled: isGuid(setup.floorPlanId) } },
    );

  const statusMapQuery =
    useNexoServerModulesRestaurantFeaturesFloorPlansStatusMapGetRestaurantFloorPlanStatusMapEndpoint(
      {
        floorPlanId: setup.floorPlanId,
        params: { at: serviceInstant, areaId: optionalText(setup.areaId) },
      },
      { query: { enabled: isGuid(setup.floorPlanId) } },
    );

  const selectedTableReservationsQuery =
    useNexoServerModulesRestaurantFeaturesReservationsListByTableListRestaurantTableReservationsEndpoint(
      { tableId: selectedTableId ?? "", params: { date: setup.date } },
      { query: { enabled: Boolean(selectedTableId) } },
    );

  useEffect(() => {
    if (!floorPlanQuery.data) {
      clearSelectedTableId();
      return;
    }

    const nextTableId =
      selectedTableId &&
      floorPlanQuery.data.tableLayouts.some(
        (table) => table.tableId === selectedTableId,
      )
        ? selectedTableId
        : floorPlanQuery.data.tableLayouts[0]?.tableId;
    if (nextTableId) {
      setSelectedTableId(nextTableId);
    } else {
      clearSelectedTableId();
    }
  }, [
    clearSelectedTableId,
    floorPlanQuery.data,
    selectedTableId,
    setSelectedTableId,
  ]);

  const floorPlan = floorPlanQuery.data ?? null;
  const statusByTable = useMemo(
    () =>
      new Map(
        statusMapQuery.data?.tables.map((status) => [status.tableId, status]) ??
          [],
      ),
    [statusMapQuery.data],
  );
  const selectedTable =
    floorPlan?.tableLayouts.find(
      (table) => table.tableId === selectedTableId,
    ) ?? null;
  const selectedStatus = selectedTableId
    ? (statusByTable.get(selectedTableId) ?? null)
    : null;
  const selectedTableReservations = selectedTableReservationsQuery.data ?? [];
  const actionReservation = findActionReservation(selectedTableReservations);
  const actionState = getTableActionState(
    selectedStatus,
    selectedTableReservations,
  );
  const visibleTables =
    floorPlan?.tableLayouts.filter(
      (table) => !setup.areaId || table.areaId === setup.areaId,
    ) ?? [];

  const statusMutation =
    useNexoServerModulesRestaurantFeaturesReservationsUpdateStatusUpdateRestaurantReservationStatusEndpoint(
      {
        mutation: {
          onSuccess: async () => {
            toast.success(labels.toasts.statusUpdated);
            setActionReason("");
            await invalidateRestaurantReservationWork(queryClient);
          },
          onError: (error) =>
            showMutationError(error, labels.toasts.statusFailed),
        },
      },
    );

  const cancelMutation =
    useNexoServerModulesRestaurantFeaturesReservationsCancelCancelRestaurantReservationEndpoint(
      {
        mutation: {
          onSuccess: async () => {
            toast.success(labels.toasts.cancelled);
            setActionReason("");
            await invalidateRestaurantReservationWork(queryClient);
          },
          onError: (error) =>
            showMutationError(error, labels.toasts.cancelFailed),
        },
      },
    );

  const blockMutation =
    useNexoServerModulesRestaurantFeaturesTableBlocksCreateCreateRestaurantTableBlockEndpoint(
      {
        mutation: {
          onSuccess: async () => {
            toast.success(labels.toasts.blockCreated);
            setActionReason("");
            await invalidateRestaurantReservationWork(queryClient);
          },
          onError: (error) =>
            showMutationError(error, labels.toasts.blockFailed),
        },
      },
    );

  const initialReservationTable =
    useMemo<RestaurantAvailabilityTableOption | null>(() => {
      if (!selectedTable) {
        return null;
      }

      const seatCount = Math.max(selectedTable.seatLayouts.length, 2);
      return {
        tableId: selectedTable.tableId,
        label: selectedTable.tableLabel,
        minCapacity: 1,
        maxCapacity: seatCount,
        startAt: serviceInstant,
        endAt: blockEndAt,
      };
    }, [blockEndAt, selectedTable, serviceInstant]);

  function handleSelectTable(tableId: string) {
    setSelectedTableId(tableId);
  }

  function handleStartReservationForSelectedTable() {
    if (!selectedTable) {
      return;
    }

    setModalInitialTable(initialReservationTable);
    setIsCreateModalOpen(true);
  }

  function handleOpenGenericReservationModal() {
    setModalInitialTable(null);
    setIsCreateModalOpen(true);
  }

  function handleBlockSelectedTable() {
    if (!selectedTable) {
      return;
    }

    blockMutation.mutate({
      data: {
        branchId: setup.branchId,
        floorId: setup.floorId || null,
        areaId: selectedTable.areaId,
        tableId: selectedTable.tableId,
        startAt: serviceInstant,
        endAt: blockEndAt,
        reason: optionalText(actionReason),
      },
    });
  }

  function handleStatus(status: RestaurantReservationStatus) {
    if (!actionReservation) {
      return;
    }

    statusMutation.mutate({
      reservationId: actionReservation.reservationId,
      data: {
        status,
        reason: optionalText(actionReason),
      },
    });
  }

  function handleCancel() {
    if (!actionReservation) {
      return;
    }

    cancelMutation.mutate({
      reservationId: actionReservation.reservationId,
      data: {
        reason: optionalText(actionReason),
      },
    });
  }

  function handleEditTable() {
    void navigate({ to: "/restaurant/floor-plan-editor" as never });
  }

  return (
    <main className="restaurant-page">
      <header className="restaurant-topbar">
        <div>
          <span className="eyebrow">{labels.app.eyebrow}</span>
          <h1>{labels.sections.floor}</h1>
        </div>
        <div className="topbar-actions">
          <div
            className="context-pill"
            data-state={contextQuery.isError ? "error" : "ready"}
          >
            {contextQuery.isPending ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <Activity size={16} />
            )}
            <span>
              {contextQuery.data?.moduleKey ??
                (contextQuery.isError
                  ? labels.app.contextBlocked
                  : labels.app.contextFallback)}
            </span>
          </div>
        </div>
      </header>

      <FloorPlanLiveToolbar
        setup={setup}
        setSetup={setSetup}
        branches={setupBranches}
        floors={setupFloors}
        floorPlans={floorPlansQuery.data}
        areas={floorPlan?.areaLayouts ?? []}
        isRefreshDisabled={!isGuid(setup.floorPlanId)}
        isRefreshing={statusMapQuery.isFetching}
        onRefresh={() => void statusMapQuery.refetch()}
      />

      <div className="operations-grid live-operations-grid">
        <section
          className="panel floor-command-panel"
          aria-labelledby="floor-heading"
        >
          <PanelHeader
            icon={<MapIcon size={18} />}
            title={labels.sections.floor}
          />
          <TableStatusLegend />
          {floorPlansQuery.isError && (
            <InlineError error={floorPlansQuery.error} />
          )}
          {floorPlanQuery.isError && (
            <InlineError error={floorPlanQuery.error} />
          )}
          {statusMapQuery.isError && (
            <InlineError error={statusMapQuery.error} />
          )}
          {floorPlanQuery.isPending && setup.floorPlanId && (
            <SkeletonRows count={3} />
          )}
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
          {!setup.floorPlanId && (
            <EmptyState
              icon={<MapIcon size={22} />}
              title={labels.states.floorPlanRequired}
            />
          )}
        </section>

        <aside className="side-stack">
          <section
            className="panel selected-table-panel"
            aria-labelledby="selected-table-heading"
          >
            <PanelHeader
              icon={<Utensils size={18} />}
              title={labels.sections.selectedTable}
            />
            <TableDetailsSidePanel
              table={selectedTable}
              areas={floorPlan?.areaLayouts ?? []}
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
              onMarkSeated={() =>
                handleStatus(RestaurantReservationStatus.Seated)
              }
              onMarkCompleted={() =>
                handleStatus(RestaurantReservationStatus.Completed)
              }
              onCancelReservation={handleCancel}
              onEditTable={handleEditTable}
            />
          </section>

          <section
            className="panel booking-panel"
            aria-labelledby="booking-heading"
          >
            <PanelHeader
              icon={<CalendarPlus size={18} />}
              title={labels.sections.booking}
              action={
                <button
                  type="button"
                  className="primary-button compact-button"
                  onClick={handleOpenGenericReservationModal}
                >
                  <CalendarPlus size={16} />
                  {labels.actions.create}
                </button>
              }
            />
            <EmptyState
              icon={<CalendarPlus size={22} />}
              title={labels.states.noTableSelected}
            />
          </section>
        </aside>
      </div>

      <CreateReservationModal
        open={isCreateModalOpen}
        setup={setup}
        initialTable={modalInitialTable}
        onClose={() => {
          setIsCreateModalOpen(false);
          setModalInitialTable(null);
        }}
      />
    </main>
  );
}

function showMutationError(error: unknown, title: string) {
  if (error instanceof Error) {
    toast.error(title, { description: error.message });
    return;
  }

  toast.error(title);
}
