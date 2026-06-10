import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CalendarDays,
  CalendarPlus,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useNexoServerModulesRestaurantFeaturesFloorPlansGetDetailsGetRestaurantFloorPlanEndpoint,
  useNexoServerModulesRestaurantFeaturesFloorPlansListListRestaurantFloorPlansEndpoint,
  useNexoServerModulesRestaurantFeaturesGetContextRestaurantContextEndpoint,
  useNexoServerModulesRestaurantFeaturesReservationsCancelCancelRestaurantReservationEndpoint,
  useNexoServerModulesRestaurantFeaturesReservationsListDailyListRestaurantReservationsEndpoint,
  useNexoServerModulesRestaurantFeaturesReservationsUpdateStatusUpdateRestaurantReservationStatusEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupGetRestaurantSetupEndpoint,
} from "../../../lib/api/generated/hooks";
import { invalidateRestaurantReservationWork } from "../api/restaurantQueryInvalidation";
import { DailyReservationsFilters } from "../components/reservations/DailyReservationsFilters";
import { DailyReservationsTable } from "../components/reservations/DailyReservationsTable";
import { CreateReservationModal } from "../components/reservations/CreateReservationModal";
import { Metric, PanelHeader } from "../components/restaurantUi";
import labels from "../labels.es.json";
import {
  defaultDailyReservationFilters,
  filterDailyReservations,
} from "../reservationFilters";
import {
  isGuid,
  normalizeRestaurantSetupScope,
  optionalText,
  updateSetup,
  useStoredSetup,
} from "../state/restaurantWorkspaceState";
import { RestaurantReservationStatus } from "../types";

export function RestaurantReservationsPage() {
  const queryClient = useQueryClient();
  const [setup, setSetup] = useStoredSetup();
  const [filters, setFilters] = useState(defaultDailyReservationFilters);
  const [statusFilter, setStatusFilter] =
    useState<RestaurantReservationStatus | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const hasRestaurantContext = isGuid(setup.branchId);

  const contextQuery =
    useNexoServerModulesRestaurantFeaturesGetContextRestaurantContextEndpoint();

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
      setFilters((current) => ({
        ...current,
        floorId: "",
        areaId: "",
        tableId: "",
      }));
    }
  }, [setSetup, setup, setupQuery.data]);

  const reservationsQuery =
    useNexoServerModulesRestaurantFeaturesReservationsListDailyListRestaurantReservationsEndpoint(
      {
        params: {
          branchId: setup.branchId,
          date: setup.date,
          status: statusFilter ?? undefined,
        },
      },
      { query: { enabled: hasRestaurantContext } },
    );

  const selectedFloorId = filters.floorId || setup.floorId;
  const selectedFloorPlanId = filters.floorId ? "" : setup.floorPlanId;
  const floorPlansQuery =
    useNexoServerModulesRestaurantFeaturesFloorPlansListListRestaurantFloorPlansEndpoint(
      { params: { branchId: setup.branchId, floorId: selectedFloorId } },
      {
        query: {
          enabled:
            hasRestaurantContext &&
            isGuid(selectedFloorId) &&
            selectedFloorPlanId.trim().length === 0,
        },
      },
    );

  const floorPlanId =
    selectedFloorPlanId || floorPlansQuery.data?.[0]?.id || "";
  const floorPlanQuery =
    useNexoServerModulesRestaurantFeaturesFloorPlansGetDetailsGetRestaurantFloorPlanEndpoint(
      { floorPlanId },
      { query: { enabled: isGuid(floorPlanId) } },
    );

  const tableContexts = useMemo(
    () =>
      floorPlanQuery.data?.tableLayouts.map((table) => ({
        tableId: table.tableId,
        floorId: selectedFloorId,
        areaId: table.areaId,
      })) ?? [],
    [floorPlanQuery.data, selectedFloorId],
  );
  const areaOptions = floorPlanQuery.data?.areaLayouts ?? [];
  const tableOptions = useMemo(
    () =>
      (floorPlanQuery.data?.tableLayouts ?? []).filter(
        (table) => !filters.areaId || table.areaId === filters.areaId,
      ),
    [filters.areaId, floorPlanQuery.data],
  );

  const visibleReservations = useMemo(
    () =>
      filterDailyReservations(
        reservationsQuery.data ?? [],
        filters,
        tableContexts,
      ),
    [filters, reservationsQuery.data, tableContexts],
  );

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

  return (
    <main className="restaurant-page">
      <header className="restaurant-topbar">
        <div>
          <span className="eyebrow">{labels.app.eyebrow}</span>
          <h1>{labels.sections.reservations}</h1>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="primary-button compact-button"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <CalendarPlus size={16} />
            {labels.actions.create}
          </button>
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

      <DailyReservationsFilters
        branchId={setup.branchId}
        branches={setupBranches}
        floors={setupFloors}
        areas={areaOptions}
        tables={tableOptions}
        date={setup.date}
        status={statusFilter}
        filters={filters}
        onBranchChange={(branchId) => {
          updateSetup(setSetup, {
            branchId,
            floorId: "",
            floorPlanId: "",
            areaId: "",
          });
          setFilters((current) => ({
            ...current,
            floorId: "",
            areaId: "",
            tableId: "",
          }));
        }}
        onDateChange={(date) => updateSetup(setSetup, { date })}
        onStatusChange={setStatusFilter}
        onFiltersChange={(patch) =>
          setFilters((current) => ({ ...current, ...patch }))
        }
      />

      <section
        className="panel reservations-panel daily-reservations-panel"
        aria-labelledby="reservations-heading"
      >
        <PanelHeader
          icon={<CalendarDays size={18} />}
          title={labels.sections.reservations}
          action={
            <div className="daily-reservations-actions">
              <Metric
                label={labels.reservations.filteredCount}
                value={visibleReservations.length}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => reservationsQuery.refetch()}
                disabled={!hasRestaurantContext || reservationsQuery.isFetching}
                aria-label={labels.actions.refresh}
              >
                <RefreshCw
                  size={16}
                  className={reservationsQuery.isFetching ? "spin" : undefined}
                />
              </button>
            </div>
          }
        />
        <DailyReservationsTable
          hasRestaurantContext={hasRestaurantContext}
          reservations={visibleReservations}
          actionReason={actionReason}
          isError={reservationsQuery.isError}
          error={reservationsQuery.error}
          isPending={reservationsQuery.isPending}
          isMutating={statusMutation.isPending || cancelMutation.isPending}
          onReasonChange={setActionReason}
          onStatus={(reservationId, status) =>
            statusMutation.mutate({
              reservationId,
              data: {
                status,
                reason: optionalText(actionReason),
              },
            })
          }
          onCancel={(reservationId) =>
            cancelMutation.mutate({
              reservationId,
              data: {
                reason: optionalText(actionReason),
              },
            })
          }
        />
      </section>

      <CreateReservationModal
        open={isCreateModalOpen}
        setup={setup}
        onClose={() => setIsCreateModalOpen(false)}
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
