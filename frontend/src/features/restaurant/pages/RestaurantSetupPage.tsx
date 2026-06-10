import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Grid3X3,
  Layers,
  Loader2,
  Map,
  Settings,
  Trash2,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import {
  useNexoServerModulesRestaurantFeaturesSetupCreateRestaurantAreaEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupCreateRestaurantBranchEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupCreateRestaurantFloorEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupCreateRestaurantFloorPlanEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupCreateRestaurantTableEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupDeleteRestaurantAreaEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupDeleteRestaurantBranchEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupDeleteRestaurantFloorEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupDeleteRestaurantFloorPlanEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupDeleteRestaurantSpecialDayEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupDeleteRestaurantTableEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupGetRestaurantSetupEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupUpdateRestaurantAreaEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupUpdateRestaurantBranchEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupUpdateRestaurantFloorEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupUpdateRestaurantFloorPlanMetadataEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupUpdateRestaurantTableEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupUpsertRestaurantOpeningHourEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupUpsertRestaurantSpecialDayEndpoint,
} from "../../../lib/api/generated/hooks";
import { invalidateRestaurantSetup } from "../api/restaurantQueryInvalidation";
import {
  EmptyState,
  Field,
  InlineError,
  Metric,
  PanelHeader,
  SkeletonRows,
} from "../components/restaurantUi";
import labels from "../labels.es.json";
import {
  optionalText,
  updateSetup,
  useStoredSetup,
} from "../state/restaurantWorkspaceState";
import {
  RestaurantAreaType,
  RestaurantTableShape,
  type DayOfWeek,
  type RestaurantAreaDetail,
  type RestaurantBranchDetail,
  type RestaurantFloorDetail,
  type RestaurantFloorPlanSummary,
  type RestaurantOpeningHourDetail,
  type RestaurantSetupSnapshot,
  type RestaurantSpecialDayDetail,
  type RestaurantTableDetail,
} from "../types";

const areaTypeOptions = [
  { value: RestaurantAreaType.DiningRoom, label: "Comedor" },
  { value: RestaurantAreaType.Terrace, label: "Terraza" },
  { value: RestaurantAreaType.Bar, label: "Bar" },
  { value: RestaurantAreaType.PrivateRoom, label: "Privado" },
  { value: RestaurantAreaType.Outdoor, label: "Exterior" },
  { value: RestaurantAreaType.Takeaway, label: "Takeaway" },
  { value: RestaurantAreaType.Other, label: "Otro" },
] as const;

const shapeOptions = [
  { value: RestaurantTableShape.Round, label: labels.shapes.round },
  { value: RestaurantTableShape.Square, label: labels.shapes.square },
  { value: RestaurantTableShape.Rectangle, label: labels.shapes.rectangle },
  { value: RestaurantTableShape.Booth, label: labels.shapes.booth },
  { value: RestaurantTableShape.Bar, label: labels.shapes.bar },
] as const;

const dayOptions = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miercoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sabado" },
] as const satisfies ReadonlyArray<{ value: DayOfWeek; label: string }>;

interface AreaFormState {
  branchId: string;
  floorId: string;
  name: string;
  type: RestaurantAreaType;
  sortOrder: number;
}

interface TableFormState {
  branchId: string;
  floorId: string;
  areaId: string;
  label: string;
  minCapacity: number;
  maxCapacity: number;
  defaultReservationMinutes: number | null;
  shape: RestaurantTableShape;
}

interface FloorPlanFormState {
  branchId: string;
  floorId: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number | null;
  isActive: boolean;
}

type SetupDeleteKind = "branch" | "floor" | "area" | "table" | "floorPlan";

interface SetupDeleteInput {
  kind: SetupDeleteKind;
  id: string;
  label: string;
}

export function RestaurantSetupPage() {
  const queryClient = useQueryClient();
  const [workspaceSetup, setWorkspaceSetup] = useStoredSetup();
  const [branchForm, setBranchForm] = useState({
    name: labels.setup.mainBranch,
    address: "",
    timeZone: "UTC",
  });
  const [floorForm, setFloorForm] = useState({
    branchId: "",
    name: labels.setup.mainFloor,
    sortOrder: 1,
  });
  const [areaForm, setAreaForm] = useState<AreaFormState>({
    branchId: "",
    floorId: "",
    name: labels.setup.mainArea,
    type: RestaurantAreaType.DiningRoom,
    sortOrder: 1,
  });
  const [tableForm, setTableForm] = useState<TableFormState>({
    branchId: "",
    floorId: "",
    areaId: "",
    label: "A1",
    minCapacity: 2,
    maxCapacity: 4,
    defaultReservationMinutes: 90,
    shape: RestaurantTableShape.Rectangle,
  });
  const [floorPlanForm, setFloorPlanForm] = useState<FloorPlanFormState>({
    branchId: "",
    floorId: "",
    name: labels.setup.mainPlan,
    canvasWidth: 1200,
    canvasHeight: 760,
    gridSize: 20,
    isActive: true,
  });
  const [pendingDelete, setPendingDelete] = useState<SetupDeleteInput | null>(
    null,
  );

  const setupQuery =
    useNexoServerModulesRestaurantFeaturesSetupGetRestaurantSetupEndpoint();

  const snapshot = setupQuery.data;
  const branches = snapshot?.branches ?? [];
  const floors = snapshot?.floors ?? [];
  const areas = snapshot?.areas ?? [];

  const selectedBranchId = pickId(branches, workspaceSetup.branchId);
  const selectedFloorId = pickId(
    floors.filter(
      (floor) => !selectedBranchId || floor.branchId === selectedBranchId,
    ),
    workspaceSetup.floorId,
  );

  const floorBranchId = floorForm.branchId || selectedBranchId;
  const areaBranchId = areaForm.branchId || selectedBranchId;
  const areaFloors = floors.filter((floor) => floor.branchId === areaBranchId);
  const areaFloorId = areaForm.floorId || pickId(areaFloors, selectedFloorId);
  const tableBranchId = tableForm.branchId || selectedBranchId;
  const tableFloors = floors.filter(
    (floor) => floor.branchId === tableBranchId,
  );
  const tableFloorId =
    tableForm.floorId || pickId(tableFloors, selectedFloorId);
  const tableAreas = areas.filter(
    (area) => area.branchId === tableBranchId && area.floorId === tableFloorId,
  );
  const floorPlanBranchId = floorPlanForm.branchId || selectedBranchId;
  const floorPlanFloors = floors.filter(
    (floor) => floor.branchId === floorPlanBranchId,
  );
  const floorPlanFloorId =
    floorPlanForm.floorId || pickId(floorPlanFloors, selectedFloorId);

  const branchMutation =
    useNexoServerModulesRestaurantFeaturesSetupCreateRestaurantBranchEndpoint({
      mutation: {
        onSuccess: async (branch) => {
          updateSetup(setWorkspaceSetup, {
            branchId: branch.id,
            floorId: "",
            areaId: "",
            floorPlanId: "",
          });
          setFloorForm((current) => ({ ...current, branchId: branch.id }));
          setBranchForm({
            name: labels.setup.mainBranch,
            address: "",
            timeZone: "UTC",
          });
          toast.success(labels.toasts.setupCreated);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error),
      },
    });

  const floorMutation =
    useNexoServerModulesRestaurantFeaturesSetupCreateRestaurantFloorEndpoint({
      mutation: {
        onSuccess: async (floor) => {
          updateSetup(setWorkspaceSetup, {
            branchId: floor.branchId,
            floorId: floor.id,
            areaId: "",
            floorPlanId: "",
          });
          setAreaForm((current) => ({
            ...current,
            branchId: floor.branchId,
            floorId: floor.id,
          }));
          setFloorPlanForm((current) => ({
            ...current,
            branchId: floor.branchId,
            floorId: floor.id,
          }));
          toast.success(labels.toasts.setupCreated);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error),
      },
    });

  const areaMutation =
    useNexoServerModulesRestaurantFeaturesSetupCreateRestaurantAreaEndpoint({
      mutation: {
        onSuccess: async (area) => {
          updateSetup(setWorkspaceSetup, {
            branchId: area.branchId,
            floorId: area.floorId,
            areaId: area.id,
          });
          setTableForm((current) => ({
            ...current,
            branchId: area.branchId,
            floorId: area.floorId,
            areaId: area.id,
          }));
          toast.success(labels.toasts.setupCreated);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error),
      },
    });

  const tableMutation =
    useNexoServerModulesRestaurantFeaturesSetupCreateRestaurantTableEndpoint({
      mutation: {
        onSuccess: async (table) => {
          updateSetup(setWorkspaceSetup, {
            branchId: table.branchId,
            floorId: table.floorId,
            areaId: table.areaId ?? "",
          });
          toast.success(labels.toasts.setupCreated);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error),
      },
    });

  const floorPlanMutation =
    useNexoServerModulesRestaurantFeaturesSetupCreateRestaurantFloorPlanEndpoint(
      {
        mutation: {
          onSuccess: async (floorPlan) => {
            updateSetup(setWorkspaceSetup, {
              branchId: floorPlan.branchId,
              floorId: floorPlan.floorId,
              floorPlanId: floorPlan.id,
            });
            toast.success(labels.toasts.setupCreated);
            await invalidateRestaurantSetup(queryClient);
          },
          onError: (error) => showMutationError(error),
        },
      },
    );

  const deleteMutationOptions = {
    onSuccess: async () => {
      if (pendingDelete) {
        clearDeletedSelection(pendingDelete, workspaceSetup, setWorkspaceSetup);
      }
      toast.success(labels.toasts.setupDeleted);
      setPendingDelete(null);
      await invalidateRestaurantSetup(queryClient);
    },
    onError: (error: unknown) => {
      setPendingDelete(null);
      showMutationError(error, labels.toasts.setupDeleteFailed);
    },
  };
  const branchDeleteMutation =
    useNexoServerModulesRestaurantFeaturesSetupDeleteRestaurantBranchEndpoint({
      mutation: deleteMutationOptions,
    });
  const floorDeleteMutation =
    useNexoServerModulesRestaurantFeaturesSetupDeleteRestaurantFloorEndpoint({
      mutation: deleteMutationOptions,
    });
  const areaDeleteMutation =
    useNexoServerModulesRestaurantFeaturesSetupDeleteRestaurantAreaEndpoint({
      mutation: deleteMutationOptions,
    });
  const tableDeleteMutation =
    useNexoServerModulesRestaurantFeaturesSetupDeleteRestaurantTableEndpoint({
      mutation: deleteMutationOptions,
    });
  const floorPlanDeleteMutation =
    useNexoServerModulesRestaurantFeaturesSetupDeleteRestaurantFloorPlanEndpoint(
      {
        mutation: deleteMutationOptions,
      },
    );
  const isDeletingSetup =
    branchDeleteMutation.isPending ||
    floorDeleteMutation.isPending ||
    areaDeleteMutation.isPending ||
    tableDeleteMutation.isPending ||
    floorPlanDeleteMutation.isPending;

  const metrics = useMemo(
    () => [
      { label: labels.setup.branches, value: snapshot?.branches.length ?? 0 },
      { label: labels.setup.floors, value: snapshot?.floors.length ?? 0 },
      { label: labels.setup.areas, value: snapshot?.areas.length ?? 0 },
      { label: labels.setup.tables, value: snapshot?.tables.length ?? 0 },
      {
        label: labels.setup.floorPlans,
        value: snapshot?.floorPlans.length ?? 0,
      },
    ],
    [snapshot],
  );

  function onCreateBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    branchMutation.mutate({
      data: {
        name: branchForm.name.trim(),
        address: optionalText(branchForm.address),
        timeZone: branchForm.timeZone.trim() || "UTC",
      },
    });
  }

  function onCreateFloor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!floorBranchId) {
      return;
    }
    floorMutation.mutate({
      data: {
        branchId: floorBranchId,
        name: floorForm.name.trim(),
        sortOrder: floorForm.sortOrder,
      },
    });
  }

  function onCreateArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!areaBranchId || !areaFloorId) {
      return;
    }
    areaMutation.mutate({
      data: {
        branchId: areaBranchId,
        floorId: areaFloorId,
        name: areaForm.name.trim(),
        type: areaForm.type,
        sortOrder: areaForm.sortOrder,
      },
    });
  }

  function onCreateTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tableBranchId || !tableFloorId) {
      return;
    }
    tableMutation.mutate({
      data: {
        branchId: tableBranchId,
        floorId: tableFloorId,
        areaId: tableForm.areaId || null,
        label: tableForm.label.trim(),
        minCapacity: tableForm.minCapacity,
        maxCapacity: tableForm.maxCapacity,
        defaultReservationMinutes: tableForm.defaultReservationMinutes,
        shape: tableForm.shape,
      },
    });
  }

  function onCreateFloorPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!floorPlanBranchId || !floorPlanFloorId) {
      return;
    }
    floorPlanMutation.mutate({
      data: {
        branchId: floorPlanBranchId,
        floorId: floorPlanFloorId,
        name: floorPlanForm.name.trim(),
        canvasWidth: floorPlanForm.canvasWidth,
        canvasHeight: floorPlanForm.canvasHeight,
        gridSize: floorPlanForm.gridSize,
        isActive: floorPlanForm.isActive,
      },
    });
  }

  function onDeleteSetupItem(input: SetupDeleteInput) {
    if (
      !window.confirm(labels.setup.confirmDelete.replace("{name}", input.label))
    ) {
      return;
    }

    setPendingDelete(input);
    switch (input.kind) {
      case "branch":
        branchDeleteMutation.mutate({ branchId: input.id });
        return;
      case "floor":
        floorDeleteMutation.mutate({ floorId: input.id });
        return;
      case "area":
        areaDeleteMutation.mutate({ areaId: input.id });
        return;
      case "table":
        tableDeleteMutation.mutate({ tableId: input.id });
        return;
      case "floorPlan":
        floorPlanDeleteMutation.mutate({ floorPlanId: input.id });
        return;
    }
  }

  return (
    <main className="restaurant-page">
      <section className="restaurant-module-page">
        <PanelHeader
          icon={<Settings size={18} />}
          title={labels.sections.setup}
        />
        {setupQuery.isLoading ? (
          <SkeletonRows count={2} />
        ) : setupQuery.isError ? (
          <InlineError error={setupQuery.error} />
        ) : (
          <div className="setup-metric-grid">
            {metrics.map((metric) => (
              <Metric
                key={metric.label}
                label={metric.label}
                value={metric.value}
              />
            ))}
          </div>
        )}
      </section>

      <div className="setup-workbench">
        <section className="panel setup-form-panel">
          <PanelHeader
            icon={<Building2 size={18} />}
            title={labels.setup.createBranch}
          />
          <form className="booking-form" onSubmit={onCreateBranch}>
            <Field label={labels.setup.name}>
              <input
                required
                value={branchForm.name}
                onChange={(event) =>
                  setBranchForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label={labels.setup.address}>
              <input
                value={branchForm.address}
                onChange={(event) =>
                  setBranchForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label={labels.setup.timeZone}>
              <input
                required
                value={branchForm.timeZone}
                onChange={(event) =>
                  setBranchForm((current) => ({
                    ...current,
                    timeZone: event.target.value,
                  }))
                }
              />
            </Field>
            <SubmitButton
              isPending={branchMutation.isPending}
              label={labels.setup.createBranch}
            />
          </form>
        </section>

        <section className="panel setup-form-panel">
          <PanelHeader
            icon={<Layers size={18} />}
            title={labels.setup.createFloor}
          />
          <form className="booking-form" onSubmit={onCreateFloor}>
            <BranchSelect
              branches={branches}
              value={floorBranchId}
              onChange={(branchId) =>
                setFloorForm((current) => ({ ...current, branchId }))
              }
            />
            <Field label={labels.setup.name}>
              <input
                required
                value={floorForm.name}
                onChange={(event) =>
                  setFloorForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label={labels.setup.sortOrder}>
              <NumberInput
                min={0}
                value={floorForm.sortOrder}
                onChange={(sortOrder) =>
                  setFloorForm((current) => ({ ...current, sortOrder }))
                }
              />
            </Field>
            <SubmitButton
              disabled={!floorBranchId}
              isPending={floorMutation.isPending}
              label={labels.setup.createFloor}
            />
          </form>
        </section>

        <section className="panel setup-form-panel">
          <PanelHeader
            icon={<Grid3X3 size={18} />}
            title={labels.setup.createArea}
          />
          <form className="booking-form" onSubmit={onCreateArea}>
            <BranchSelect
              branches={branches}
              value={areaBranchId}
              onChange={(branchId) =>
                setAreaForm((current) => ({
                  ...current,
                  branchId,
                  floorId: "",
                }))
              }
            />
            <FloorSelect
              floors={areaFloors}
              value={areaFloorId}
              onChange={(floorId) =>
                setAreaForm((current) => ({ ...current, floorId }))
              }
            />
            <div className="form-row">
              <Field label={labels.setup.name}>
                <input
                  required
                  value={areaForm.name}
                  onChange={(event) =>
                    setAreaForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label={labels.setup.areaType}>
                <select
                  value={areaForm.type}
                  onChange={(event) =>
                    setAreaForm((current) => ({
                      ...current,
                      type: Number(event.target.value) as RestaurantAreaType,
                    }))
                  }
                >
                  {areaTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={labels.setup.sortOrder}>
              <NumberInput
                min={0}
                value={areaForm.sortOrder}
                onChange={(sortOrder) =>
                  setAreaForm((current) => ({ ...current, sortOrder }))
                }
              />
            </Field>
            <SubmitButton
              disabled={!areaBranchId || !areaFloorId}
              isPending={areaMutation.isPending}
              label={labels.setup.createArea}
            />
          </form>
        </section>

        <section className="panel setup-form-panel">
          <PanelHeader
            icon={<Utensils size={18} />}
            title={labels.setup.createTable}
          />
          <form className="booking-form" onSubmit={onCreateTable}>
            <BranchSelect
              branches={branches}
              value={tableBranchId}
              onChange={(branchId) =>
                setTableForm((current) => ({
                  ...current,
                  branchId,
                  floorId: "",
                  areaId: "",
                }))
              }
            />
            <FloorSelect
              floors={tableFloors}
              value={tableFloorId}
              onChange={(floorId) =>
                setTableForm((current) => ({ ...current, floorId, areaId: "" }))
              }
            />
            <Field label={labels.setup.area}>
              <select
                value={tableForm.areaId}
                onChange={(event) =>
                  setTableForm((current) => ({
                    ...current,
                    areaId: event.target.value,
                  }))
                }
              >
                <option value="">{labels.states.unassigned}</option>
                {tableAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-row">
              <Field label={labels.setup.tableLabel}>
                <input
                  required
                  value={tableForm.label}
                  onChange={(event) =>
                    setTableForm((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label={labels.fields.shape}>
                <select
                  value={tableForm.shape}
                  onChange={(event) =>
                    setTableForm((current) => ({
                      ...current,
                      shape: Number(event.target.value) as RestaurantTableShape,
                    }))
                  }
                >
                  {shapeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="form-row">
              <Field label={labels.setup.minCapacity}>
                <NumberInput
                  min={1}
                  value={tableForm.minCapacity}
                  onChange={(minCapacity) =>
                    setTableForm((current) => ({
                      ...current,
                      minCapacity,
                      maxCapacity: Math.max(minCapacity, current.maxCapacity),
                    }))
                  }
                />
              </Field>
              <Field label={labels.setup.maxCapacity}>
                <NumberInput
                  min={tableForm.minCapacity}
                  value={tableForm.maxCapacity}
                  onChange={(maxCapacity) =>
                    setTableForm((current) => ({ ...current, maxCapacity }))
                  }
                />
              </Field>
            </div>
            <Field label={labels.setup.defaultDuration}>
              <NumberInput
                min={15}
                value={tableForm.defaultReservationMinutes}
                onChange={(defaultReservationMinutes) =>
                  setTableForm((current) => ({
                    ...current,
                    defaultReservationMinutes,
                  }))
                }
              />
            </Field>
            <SubmitButton
              disabled={!tableBranchId || !tableFloorId}
              isPending={tableMutation.isPending}
              label={labels.setup.createTable}
            />
          </form>
        </section>

        <section className="panel setup-form-panel">
          <PanelHeader
            icon={<Map size={18} />}
            title={labels.setup.createFloorPlan}
          />
          <form className="booking-form" onSubmit={onCreateFloorPlan}>
            <BranchSelect
              branches={branches}
              value={floorPlanBranchId}
              onChange={(branchId) =>
                setFloorPlanForm((current) => ({
                  ...current,
                  branchId,
                  floorId: "",
                }))
              }
            />
            <FloorSelect
              floors={floorPlanFloors}
              value={floorPlanFloorId}
              onChange={(floorId) =>
                setFloorPlanForm((current) => ({ ...current, floorId }))
              }
            />
            <Field label={labels.setup.name}>
              <input
                required
                value={floorPlanForm.name}
                onChange={(event) =>
                  setFloorPlanForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
            <div className="form-row">
              <Field label={labels.fields.width}>
                <NumberInput
                  min={400}
                  value={floorPlanForm.canvasWidth}
                  onChange={(canvasWidth) =>
                    setFloorPlanForm((current) => ({ ...current, canvasWidth }))
                  }
                />
              </Field>
              <Field label={labels.fields.height}>
                <NumberInput
                  min={300}
                  value={floorPlanForm.canvasHeight}
                  onChange={(canvasHeight) =>
                    setFloorPlanForm((current) => ({
                      ...current,
                      canvasHeight,
                    }))
                  }
                />
              </Field>
            </div>
            <Field label={labels.setup.gridSize}>
              <NumberInput
                min={0}
                value={floorPlanForm.gridSize}
                onChange={(gridSize) =>
                  setFloorPlanForm((current) => ({
                    ...current,
                    gridSize: gridSize || null,
                  }))
                }
              />
            </Field>
            <label className="editor-check-row">
              <input
                checked={floorPlanForm.isActive}
                type="checkbox"
                onChange={(event) =>
                  setFloorPlanForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              <span>{labels.editor.activeManagedBySetup}</span>
            </label>
            <SubmitButton
              disabled={!floorPlanBranchId || !floorPlanFloorId}
              isPending={floorPlanMutation.isPending}
              label={labels.setup.createFloorPlan}
            />
          </form>
        </section>

        <section className="panel setup-summary-panel">
          <PanelHeader
            icon={<Settings size={18} />}
            title={labels.setup.currentSetup}
          />
          {setupQuery.isLoading ? (
            <SkeletonRows count={4} />
          ) : setupQuery.isError ? (
            <InlineError error={setupQuery.error} />
          ) : snapshot ? (
            <SetupSummary
              pendingDeleteKey={
                isDeletingSetup && pendingDelete ? deleteKey(pendingDelete) : ""
              }
              snapshot={snapshot}
              onDelete={onDeleteSetupItem}
            />
          ) : (
            <EmptyState
              icon={<Settings size={20} />}
              title={labels.setup.noSetup}
            />
          )}
        </section>
      </div>

      {snapshot ? (
        <div className="setup-edit-workbench">
          <BranchEditPanel branches={branches} />
          <FloorEditPanel branches={branches} floors={floors} />
          <AreaEditPanel branches={branches} floors={floors} areas={areas} />
          <TableEditPanel
            areas={areas}
            branches={branches}
            floors={floors}
            tables={snapshot.tables}
          />
          <FloorPlanMetadataPanel
            branches={branches}
            floorPlans={snapshot.floorPlans}
            floors={floors}
          />
          <OpeningHoursPanel
            branchId={selectedBranchId}
            branches={branches}
            openingHours={snapshot.openingHours}
          />
          <SpecialDaysPanel
            branchId={selectedBranchId}
            branches={branches}
            specialDays={snapshot.specialDays}
          />
        </div>
      ) : null}
    </main>
  );
}

function BranchEditPanel({
  branches,
}: {
  branches: RestaurantBranchDetail[];
}) {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState("");
  const selected = branches.find((branch) => branch.id === branchId);
  const [form, setForm] = useState({
    name: "",
    address: "",
    timeZone: "UTC",
    isActive: true,
  });
  useEffect(() => {
    const branch = selected ?? branches[0];
    setBranchId(branch?.id ?? "");
    setForm({
      name: branch?.name ?? "",
      address: branch?.address ?? "",
      timeZone: branch?.timeZone ?? "UTC",
      isActive: branch?.isActive ?? true,
    });
  }, [branches, selected]);

  const mutation =
    useNexoServerModulesRestaurantFeaturesSetupUpdateRestaurantBranchEndpoint({
      mutation: {
        onSuccess: async () => {
          toast.success(labels.toasts.setupUpdated);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error, labels.toasts.setupUpdateFailed),
      },
    });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId) {
      return;
    }

    mutation.mutate({
      branchId,
      data: {
        name: form.name.trim(),
        address: optionalText(form.address),
        timeZone: form.timeZone.trim() || "UTC",
        isActive: form.isActive,
      },
    });
  }

  return (
    <section className="panel setup-form-panel">
      <PanelHeader icon={<Building2 size={18} />} title={labels.setup.editBranch} />
      <form className="booking-form" onSubmit={onSubmit}>
        <BranchSelect branches={branches} value={branchId} onChange={setBranchId} />
        <Field label={labels.setup.name}>
          <input
            required
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </Field>
        <Field label={labels.setup.address}>
          <input
            value={form.address}
            onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
          />
        </Field>
        <Field label={labels.setup.timeZone}>
          <input
            required
            value={form.timeZone}
            onChange={(event) => setForm((current) => ({ ...current, timeZone: event.target.value }))}
          />
        </Field>
        <ActiveCheckbox
          checked={form.isActive}
          onChange={(isActive) => setForm((current) => ({ ...current, isActive }))}
        />
        <SubmitButton disabled={!branchId} isPending={mutation.isPending} label={labels.actions.save} />
      </form>
    </section>
  );
}

function FloorEditPanel({
  branches,
  floors,
}: {
  branches: RestaurantBranchDetail[];
  floors: RestaurantFloorDetail[];
}) {
  const queryClient = useQueryClient();
  const [floorId, setFloorId] = useState("");
  const selected = floors.find((floor) => floor.id === floorId);
  const [form, setForm] = useState({
    branchId: "",
    name: "",
    sortOrder: 1,
    isActive: true,
  });
  useEffect(() => {
    const floor = selected ?? floors[0];
    setFloorId(floor?.id ?? "");
    setForm({
      branchId: floor?.branchId ?? branches[0]?.id ?? "",
      name: floor?.name ?? "",
      sortOrder: floor?.sortOrder ?? 1,
      isActive: floor?.isActive ?? true,
    });
  }, [branches, floors, selected]);

  const mutation =
    useNexoServerModulesRestaurantFeaturesSetupUpdateRestaurantFloorEndpoint({
      mutation: {
        onSuccess: async () => {
          toast.success(labels.toasts.setupUpdated);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error, labels.toasts.setupUpdateFailed),
      },
    });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!floorId || !form.branchId) {
      return;
    }

    mutation.mutate({
      floorId,
      data: form,
    });
  }

  return (
    <section className="panel setup-form-panel">
      <PanelHeader icon={<Layers size={18} />} title={labels.setup.editFloor} />
      <form className="booking-form" onSubmit={onSubmit}>
        <EntitySelect
          label={labels.setup.floor}
          placeholder={labels.states.floorRequired}
          value={floorId}
          items={floors}
          render={(floor) => floor.name}
          onChange={setFloorId}
        />
        <BranchSelect
          branches={branches}
          value={form.branchId}
          onChange={(branchId) => setForm((current) => ({ ...current, branchId }))}
        />
        <Field label={labels.setup.name}>
          <input
            required
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </Field>
        <Field label={labels.setup.sortOrder}>
          <NumberInput
            min={0}
            value={form.sortOrder}
            onChange={(sortOrder) => setForm((current) => ({ ...current, sortOrder }))}
          />
        </Field>
        <ActiveCheckbox
          checked={form.isActive}
          onChange={(isActive) => setForm((current) => ({ ...current, isActive }))}
        />
        <SubmitButton disabled={!floorId || !form.branchId} isPending={mutation.isPending} label={labels.actions.save} />
      </form>
    </section>
  );
}

function AreaEditPanel({
  areas,
  branches,
  floors,
}: {
  areas: RestaurantAreaDetail[];
  branches: RestaurantBranchDetail[];
  floors: RestaurantFloorDetail[];
}) {
  const queryClient = useQueryClient();
  const [areaId, setAreaId] = useState("");
  const selected = areas.find((area) => area.id === areaId);
  const [form, setForm] = useState<AreaFormState & { isActive: boolean }>({
    branchId: "",
    floorId: "",
    name: "",
    type: RestaurantAreaType.DiningRoom,
    sortOrder: 1,
    isActive: true,
  });
  const filteredFloors = floors.filter((floor) => floor.branchId === form.branchId);
  useEffect(() => {
    const area = selected ?? areas[0];
    setAreaId(area?.id ?? "");
    setForm({
      branchId: area?.branchId ?? branches[0]?.id ?? "",
      floorId: area?.floorId ?? "",
      name: area?.name ?? "",
      type: area?.type ?? RestaurantAreaType.DiningRoom,
      sortOrder: area?.sortOrder ?? 1,
      isActive: area?.isActive ?? true,
    });
  }, [areas, branches, selected]);

  const mutation =
    useNexoServerModulesRestaurantFeaturesSetupUpdateRestaurantAreaEndpoint({
      mutation: {
        onSuccess: async () => {
          toast.success(labels.toasts.setupUpdated);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error, labels.toasts.setupUpdateFailed),
      },
    });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!areaId || !form.branchId || !form.floorId) {
      return;
    }

    mutation.mutate({ areaId, data: form });
  }

  return (
    <section className="panel setup-form-panel">
      <PanelHeader icon={<Grid3X3 size={18} />} title={labels.setup.editArea} />
      <form className="booking-form" onSubmit={onSubmit}>
        <EntitySelect
          label={labels.setup.area}
          placeholder={labels.states.unassigned}
          value={areaId}
          items={areas}
          render={(area) => area.name}
          onChange={setAreaId}
        />
        <BranchSelect
          branches={branches}
          value={form.branchId}
          onChange={(branchId) => setForm((current) => ({ ...current, branchId, floorId: "" }))}
        />
        <FloorSelect
          floors={filteredFloors}
          value={form.floorId}
          onChange={(floorId) => setForm((current) => ({ ...current, floorId }))}
        />
        <div className="form-row">
          <Field label={labels.setup.name}>
            <input
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field label={labels.setup.areaType}>
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: Number(event.target.value) as RestaurantAreaType }))
              }
            >
              {areaTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={labels.setup.sortOrder}>
          <NumberInput
            min={0}
            value={form.sortOrder}
            onChange={(sortOrder) => setForm((current) => ({ ...current, sortOrder }))}
          />
        </Field>
        <ActiveCheckbox
          checked={form.isActive}
          onChange={(isActive) => setForm((current) => ({ ...current, isActive }))}
        />
        <SubmitButton disabled={!areaId || !form.branchId || !form.floorId} isPending={mutation.isPending} label={labels.actions.save} />
      </form>
    </section>
  );
}

function TableEditPanel({
  areas,
  branches,
  floors,
  tables,
}: {
  areas: RestaurantAreaDetail[];
  branches: RestaurantBranchDetail[];
  floors: RestaurantFloorDetail[];
  tables: RestaurantTableDetail[];
}) {
  const queryClient = useQueryClient();
  const [tableId, setTableId] = useState("");
  const selected = tables.find((table) => table.id === tableId);
  const [form, setForm] = useState<TableFormState & { isActive: boolean }>({
    branchId: "",
    floorId: "",
    areaId: "",
    label: "",
    minCapacity: 1,
    maxCapacity: 4,
    defaultReservationMinutes: 90,
    shape: RestaurantTableShape.Rectangle,
    isActive: true,
  });
  const filteredFloors = floors.filter((floor) => floor.branchId === form.branchId);
  const filteredAreas = areas.filter((area) => area.branchId === form.branchId && area.floorId === form.floorId);
  useEffect(() => {
    const table = selected ?? tables[0];
    setTableId(table?.id ?? "");
    setForm({
      branchId: table?.branchId ?? branches[0]?.id ?? "",
      floorId: table?.floorId ?? "",
      areaId: table?.areaId ?? "",
      label: table?.label ?? "",
      minCapacity: table?.minCapacity ?? 1,
      maxCapacity: table?.maxCapacity ?? 4,
      defaultReservationMinutes: table?.defaultReservationMinutes ?? 90,
      shape: table?.shape ?? RestaurantTableShape.Rectangle,
      isActive: table?.isActive ?? true,
    });
  }, [branches, selected, tables]);

  const mutation =
    useNexoServerModulesRestaurantFeaturesSetupUpdateRestaurantTableEndpoint({
      mutation: {
        onSuccess: async () => {
          toast.success(labels.toasts.setupUpdated);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error, labels.toasts.setupUpdateFailed),
      },
    });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tableId || !form.branchId || !form.floorId) {
      return;
    }

    mutation.mutate({
      tableId,
      data: {
        ...form,
        areaId: form.areaId || null,
        label: form.label.trim(),
      },
    });
  }

  return (
    <section className="panel setup-form-panel">
      <PanelHeader icon={<Utensils size={18} />} title={labels.setup.editTable} />
      <form className="booking-form" onSubmit={onSubmit}>
        <EntitySelect
          label={labels.setup.table}
          placeholder={labels.states.noTableSelected}
          value={tableId}
          items={tables}
          render={(table) => table.label}
          onChange={setTableId}
        />
        <BranchSelect
          branches={branches}
          value={form.branchId}
          onChange={(branchId) => setForm((current) => ({ ...current, branchId, floorId: "", areaId: "" }))}
        />
        <FloorSelect
          floors={filteredFloors}
          value={form.floorId}
          onChange={(floorId) => setForm((current) => ({ ...current, floorId, areaId: "" }))}
        />
        <Field label={labels.setup.area}>
          <select
            value={form.areaId}
            onChange={(event) => setForm((current) => ({ ...current, areaId: event.target.value }))}
          >
            <option value="">{labels.states.unassigned}</option>
            {filteredAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-row">
          <Field label={labels.setup.tableLabel}>
            <input
              required
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            />
          </Field>
          <Field label={labels.fields.shape}>
            <select
              value={form.shape}
              onChange={(event) =>
                setForm((current) => ({ ...current, shape: Number(event.target.value) as RestaurantTableShape }))
              }
            >
              {shapeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label={labels.setup.minCapacity}>
            <NumberInput
              min={1}
              value={form.minCapacity}
              onChange={(minCapacity) =>
                setForm((current) => ({ ...current, minCapacity, maxCapacity: Math.max(minCapacity, current.maxCapacity) }))
              }
            />
          </Field>
          <Field label={labels.setup.maxCapacity}>
            <NumberInput
              min={form.minCapacity}
              value={form.maxCapacity}
              onChange={(maxCapacity) => setForm((current) => ({ ...current, maxCapacity }))}
            />
          </Field>
        </div>
        <Field label={labels.setup.defaultDuration}>
          <NumberInput
            min={15}
            value={form.defaultReservationMinutes}
            onChange={(defaultReservationMinutes) => setForm((current) => ({ ...current, defaultReservationMinutes }))}
          />
        </Field>
        <ActiveCheckbox
          checked={form.isActive}
          onChange={(isActive) => setForm((current) => ({ ...current, isActive }))}
        />
        <SubmitButton disabled={!tableId || !form.branchId || !form.floorId} isPending={mutation.isPending} label={labels.actions.save} />
      </form>
    </section>
  );
}

function FloorPlanMetadataPanel({
  branches,
  floorPlans,
  floors,
}: {
  branches: RestaurantBranchDetail[];
  floorPlans: RestaurantFloorPlanSummary[];
  floors: RestaurantFloorDetail[];
}) {
  const queryClient = useQueryClient();
  const [floorPlanId, setFloorPlanId] = useState("");
  const selected = floorPlans.find((floorPlan) => floorPlan.id === floorPlanId);
  const [form, setForm] = useState<FloorPlanFormState>({
    branchId: "",
    floorId: "",
    name: "",
    canvasWidth: 1200,
    canvasHeight: 760,
    gridSize: 20,
    isActive: true,
  });
  const filteredFloors = floors.filter((floor) => floor.branchId === form.branchId);
  useEffect(() => {
    const floorPlan = selected ?? floorPlans[0];
    setFloorPlanId(floorPlan?.id ?? "");
    setForm({
      branchId: floorPlan?.branchId ?? branches[0]?.id ?? "",
      floorId: floorPlan?.floorId ?? "",
      name: floorPlan?.name ?? "",
      canvasWidth: floorPlan?.canvasWidth ?? 1200,
      canvasHeight: floorPlan?.canvasHeight ?? 760,
      gridSize: floorPlan?.gridSize ?? 20,
      isActive: floorPlan?.isActive ?? true,
    });
  }, [branches, floorPlans, selected]);

  const mutation =
    useNexoServerModulesRestaurantFeaturesSetupUpdateRestaurantFloorPlanMetadataEndpoint({
      mutation: {
        onSuccess: async () => {
          toast.success(labels.toasts.setupUpdated);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error, labels.toasts.setupUpdateFailed),
      },
    });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!floorPlanId || !form.branchId || !form.floorId) {
      return;
    }

    mutation.mutate({
      floorPlanId,
      data: {
        ...form,
        gridSize: form.gridSize || null,
        name: form.name.trim(),
      },
    });
  }

  return (
    <section className="panel setup-form-panel">
      <PanelHeader icon={<Map size={18} />} title={labels.setup.editFloorPlan} />
      <form className="booking-form" onSubmit={onSubmit}>
        <EntitySelect
          label={labels.setup.floorPlan}
          placeholder={labels.states.floorPlanRequired}
          value={floorPlanId}
          items={floorPlans}
          render={(floorPlan) => floorPlan.name}
          onChange={setFloorPlanId}
        />
        <BranchSelect
          branches={branches}
          value={form.branchId}
          onChange={(branchId) => setForm((current) => ({ ...current, branchId, floorId: "" }))}
        />
        <FloorSelect
          floors={filteredFloors}
          value={form.floorId}
          onChange={(floorId) => setForm((current) => ({ ...current, floorId }))}
        />
        <Field label={labels.setup.name}>
          <input
            required
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </Field>
        <div className="form-row">
          <Field label={labels.fields.width}>
            <NumberInput
              min={400}
              value={form.canvasWidth}
              onChange={(canvasWidth) => setForm((current) => ({ ...current, canvasWidth }))}
            />
          </Field>
          <Field label={labels.fields.height}>
            <NumberInput
              min={300}
              value={form.canvasHeight}
              onChange={(canvasHeight) => setForm((current) => ({ ...current, canvasHeight }))}
            />
          </Field>
        </div>
        <Field label={labels.setup.gridSize}>
          <NumberInput
            min={0}
            value={form.gridSize}
            onChange={(gridSize) => setForm((current) => ({ ...current, gridSize: gridSize || null }))}
          />
        </Field>
        <ActiveCheckbox
          checked={form.isActive}
          onChange={(isActive) => setForm((current) => ({ ...current, isActive }))}
        />
        <SubmitButton disabled={!floorPlanId || !form.branchId || !form.floorId} isPending={mutation.isPending} label={labels.actions.save} />
      </form>
    </section>
  );
}

function OpeningHoursPanel({
  branchId,
  branches,
  openingHours,
}: {
  branchId: string;
  branches: RestaurantBranchDetail[];
  openingHours: RestaurantOpeningHourDetail[];
}) {
  const branch = branches.find((item) => item.id === branchId);
  const branchHours = openingHours.filter((hour) => hour.branchId === branchId);

  return (
    <section className="panel setup-hours-panel">
      <PanelHeader icon={<Settings size={18} />} title={labels.setup.openingHours} />
      {branch ? (
        <div className="setup-hours-list">
          {dayOptions.map((day) => (
            <OpeningHourRow
              key={`${branch.id}:${day.value}`}
              branchId={branch.id}
              day={day}
              openingHour={branchHours.find((hour) => hour.dayOfWeek === day.value)}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Settings size={20} />} title={labels.states.branchRequired} />
      )}
    </section>
  );
}

function OpeningHourRow({
  branchId,
  day,
  openingHour,
}: {
  branchId: string;
  day: (typeof dayOptions)[number];
  openingHour: RestaurantOpeningHourDetail | undefined;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    isClosed: openingHour?.isClosed ?? false,
    opensAt: trimTime(openingHour?.opensAt) || "11:00",
    closesAt: trimTime(openingHour?.closesAt) || "23:00",
  });
  useEffect(() => {
    setForm({
      isClosed: openingHour?.isClosed ?? false,
      opensAt: trimTime(openingHour?.opensAt) || "11:00",
      closesAt: trimTime(openingHour?.closesAt) || "23:00",
    });
  }, [openingHour]);

  const mutation =
    useNexoServerModulesRestaurantFeaturesSetupUpsertRestaurantOpeningHourEndpoint({
      mutation: {
        onSuccess: async () => {
          toast.success(labels.toasts.setupUpdated);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error, labels.toasts.setupUpdateFailed),
      },
    });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({
      data: {
        branchId,
        dayOfWeek: day.value,
        opensAt: form.opensAt,
        closesAt: form.closesAt,
        isClosed: form.isClosed,
      },
    });
  }

  return (
    <form className="setup-hours-row" onSubmit={onSubmit}>
      <strong>{day.label}</strong>
      <label className="editor-check-row">
        <input
          checked={form.isClosed}
          type="checkbox"
          onChange={(event) => setForm((current) => ({ ...current, isClosed: event.target.checked }))}
        />
        <span>{labels.setup.closed}</span>
      </label>
      <input
        disabled={form.isClosed}
        required={!form.isClosed}
        type="time"
        value={form.opensAt}
        onChange={(event) => setForm((current) => ({ ...current, opensAt: event.target.value }))}
      />
      <input
        disabled={form.isClosed}
        required={!form.isClosed}
        type="time"
        value={form.closesAt}
        onChange={(event) => setForm((current) => ({ ...current, closesAt: event.target.value }))}
      />
      <button className="secondary-button" disabled={mutation.isPending} type="submit">
        {mutation.isPending ? <Loader2 className="spin" size={16} /> : labels.actions.save}
      </button>
    </form>
  );
}

function SpecialDaysPanel({
  branchId,
  branches,
  specialDays,
}: {
  branchId: string;
  branches: RestaurantBranchDetail[];
  specialDays: RestaurantSpecialDayDetail[];
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    date: "",
    name: "",
    isClosed: true,
    opensAt: "11:00",
    closesAt: "23:00",
  });
  const branch = branches.find((item) => item.id === branchId);
  const branchSpecialDays = specialDays.filter((day) => day.branchId === branchId);
  const mutation =
    useNexoServerModulesRestaurantFeaturesSetupUpsertRestaurantSpecialDayEndpoint({
      mutation: {
        onSuccess: async () => {
          setForm({ date: "", name: "", isClosed: true, opensAt: "11:00", closesAt: "23:00" });
          toast.success(labels.toasts.setupUpdated);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error, labels.toasts.setupUpdateFailed),
      },
    });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId) {
      return;
    }

    mutation.mutate({
      data: {
        id: null,
        branchId,
        date: form.date,
        name: form.name.trim(),
        isClosed: form.isClosed,
        opensAt: form.isClosed ? null : form.opensAt,
        closesAt: form.isClosed ? null : form.closesAt,
      },
    });
  }

  return (
    <section className="panel setup-special-days-panel">
      <PanelHeader icon={<Settings size={18} />} title={labels.setup.specialDays} />
      {branch ? (
        <>
          <form className="booking-form setup-special-day-form" onSubmit={onSubmit}>
            <div className="form-row">
              <Field label={labels.setup.date}>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                />
              </Field>
              <Field label={labels.setup.name}>
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </Field>
            </div>
            <SpecialDayTimeFields form={form} setForm={setForm} />
            <SubmitButton disabled={!branchId} isPending={mutation.isPending} label={labels.setup.addSpecialDay} />
          </form>
          <div className="setup-special-day-list">
            {branchSpecialDays.length === 0 ? (
              <EmptyState icon={<Settings size={20} />} title={labels.setup.noSpecialDays} />
            ) : (
              branchSpecialDays.map((specialDay) => (
                <SpecialDayRow key={specialDay.id} specialDay={specialDay} />
              ))
            )}
          </div>
        </>
      ) : (
        <EmptyState icon={<Settings size={20} />} title={labels.states.branchRequired} />
      )}
    </section>
  );
}

function SpecialDayRow({ specialDay }: { specialDay: RestaurantSpecialDayDetail }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    date: specialDay.date,
    name: specialDay.name,
    isClosed: specialDay.isClosed,
    opensAt: trimTime(specialDay.opensAt) || "11:00",
    closesAt: trimTime(specialDay.closesAt) || "23:00",
  });
  useEffect(() => {
    setForm({
      date: specialDay.date,
      name: specialDay.name,
      isClosed: specialDay.isClosed,
      opensAt: trimTime(specialDay.opensAt) || "11:00",
      closesAt: trimTime(specialDay.closesAt) || "23:00",
    });
  }, [specialDay]);

  const updateMutation =
    useNexoServerModulesRestaurantFeaturesSetupUpsertRestaurantSpecialDayEndpoint({
      mutation: {
        onSuccess: async () => {
          toast.success(labels.toasts.setupUpdated);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error, labels.toasts.setupUpdateFailed),
      },
    });
  const deleteMutation =
    useNexoServerModulesRestaurantFeaturesSetupDeleteRestaurantSpecialDayEndpoint({
      mutation: {
        onSuccess: async () => {
          toast.success(labels.toasts.setupDeleted);
          await invalidateRestaurantSetup(queryClient);
        },
        onError: (error) => showMutationError(error, labels.toasts.setupDeleteFailed),
      },
    });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateMutation.mutate({
      data: {
        id: specialDay.id,
        branchId: specialDay.branchId,
        date: form.date,
        name: form.name.trim(),
        isClosed: form.isClosed,
        opensAt: form.isClosed ? null : form.opensAt,
        closesAt: form.isClosed ? null : form.closesAt,
      },
    });
  }

  return (
    <form className="setup-special-day-row" onSubmit={onSubmit}>
      <div className="form-row">
        <Field label={labels.setup.date}>
          <input
            required
            type="date"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
        </Field>
        <Field label={labels.setup.name}>
          <input
            required
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </Field>
      </div>
      <SpecialDayTimeFields form={form} setForm={setForm} />
      <div className="setup-row-actions">
        <button className="secondary-button" disabled={updateMutation.isPending || deleteMutation.isPending} type="submit">
          {updateMutation.isPending ? <Loader2 className="spin" size={16} /> : labels.actions.save}
        </button>
        <button
          className="danger-button"
          disabled={updateMutation.isPending || deleteMutation.isPending}
          type="button"
          onClick={() => {
            if (window.confirm(labels.setup.confirmDelete.replace("{name}", form.name))) {
              deleteMutation.mutate({ specialDayId: specialDay.id });
            }
          }}
        >
          {deleteMutation.isPending ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
        </button>
      </div>
    </form>
  );
}

function SpecialDayTimeFields({
  form,
  setForm,
}: {
  form: { isClosed: boolean; opensAt: string; closesAt: string };
  setForm: Dispatch<
    SetStateAction<{
      date: string;
      name: string;
      isClosed: boolean;
      opensAt: string;
      closesAt: string;
    }>
  >;
}) {
  return (
    <>
      <label className="editor-check-row">
        <input
          checked={form.isClosed}
          type="checkbox"
          onChange={(event) => setForm((current) => ({ ...current, isClosed: event.target.checked }))}
        />
        <span>{labels.setup.closed}</span>
      </label>
      <div className="form-row">
        <Field label={labels.setup.opensAt}>
          <input
            disabled={form.isClosed}
            required={!form.isClosed}
            type="time"
            value={form.opensAt}
            onChange={(event) => setForm((current) => ({ ...current, opensAt: event.target.value }))}
          />
        </Field>
        <Field label={labels.setup.closesAt}>
          <input
            disabled={form.isClosed}
            required={!form.isClosed}
            type="time"
            value={form.closesAt}
            onChange={(event) => setForm((current) => ({ ...current, closesAt: event.target.value }))}
          />
        </Field>
      </div>
    </>
  );
}

function BranchSelect({
  branches,
  value,
  onChange,
}: {
  branches: RestaurantBranchDetail[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={labels.setup.branch}>
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{labels.states.branchRequired}</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function FloorSelect({
  floors,
  value,
  onChange,
}: {
  floors: RestaurantFloorDetail[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={labels.setup.floor}>
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{labels.states.floorRequired}</option>
        {floors.map((floor) => (
          <option key={floor.id} value={floor.id}>
            {floor.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function EntitySelect<TItem extends { id: string }>({
  items,
  label,
  placeholder,
  render,
  value,
  onChange,
}: {
  items: TItem[];
  label: string;
  placeholder: string;
  render: (item: TItem) => string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {render(item)}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ActiveCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="editor-check-row">
      <input
        checked={checked}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{labels.setup.isActive}</span>
    </label>
  );
}

function NumberInput({
  min,
  value,
  onChange,
}: {
  min: number;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <input
      min={min}
      required
      type="number"
      value={value ?? ""}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

function SubmitButton({
  disabled = false,
  isPending,
  label,
}: {
  disabled?: boolean;
  isPending: boolean;
  label: string;
}) {
  return (
    <button
      className="primary-button"
      disabled={disabled || isPending}
      type="submit"
    >
      {isPending ? (
        <>
          <Loader2 className="spin" size={16} />
          {labels.states.syncing}
        </>
      ) : (
        label
      )}
    </button>
  );
}

function SetupSummary({
  pendingDeleteKey,
  snapshot,
  onDelete,
}: {
  pendingDeleteKey: string;
  snapshot: RestaurantSetupSnapshot;
  onDelete: (input: SetupDeleteInput) => void;
}) {
  if (
    snapshot.branches.length === 0 &&
    snapshot.floors.length === 0 &&
    snapshot.areas.length === 0 &&
    snapshot.tables.length === 0 &&
    snapshot.floorPlans.length === 0
  ) {
    return (
      <EmptyState icon={<Settings size={20} />} title={labels.setup.noSetup} />
    );
  }

  return (
    <div className="setup-summary-list">
      <SummaryGroup
        kind="branch"
        items={snapshot.branches}
        pendingDeleteKey={pendingDeleteKey}
        title={labels.setup.branches}
        render={(branch) => branch.name}
        onDelete={onDelete}
      />
      <SummaryGroup
        kind="floor"
        items={snapshot.floors}
        pendingDeleteKey={pendingDeleteKey}
        title={labels.setup.floors}
        render={(floor) => floor.name}
        onDelete={onDelete}
      />
      <SummaryGroup
        kind="area"
        items={snapshot.areas}
        pendingDeleteKey={pendingDeleteKey}
        title={labels.setup.areas}
        render={(area) => `${area.name} / ${areaTypeLabel(area.type)}`}
        onDelete={onDelete}
      />
      <SummaryGroup
        kind="table"
        items={snapshot.tables}
        pendingDeleteKey={pendingDeleteKey}
        title={labels.setup.tables}
        render={(table) =>
          `${table.label} / ${table.minCapacity}-${table.maxCapacity}`
        }
        onDelete={onDelete}
      />
      <SummaryGroup
        kind="floorPlan"
        items={snapshot.floorPlans}
        pendingDeleteKey={pendingDeleteKey}
        title={labels.setup.floorPlans}
        render={(plan) => plan.name}
        onDelete={onDelete}
      />
    </div>
  );
}

function SummaryGroup<
  TItem extends
    | RestaurantAreaDetail
    | RestaurantBranchDetail
    | RestaurantFloorDetail
    | RestaurantFloorPlanSummary
    | RestaurantTableDetail,
>({
  kind,
  items,
  pendingDeleteKey,
  render,
  title,
  onDelete,
}: {
  kind: SetupDeleteKind;
  items: TItem[];
  pendingDeleteKey: string;
  render: (item: TItem) => string;
  title: string;
  onDelete: (input: SetupDeleteInput) => void;
}) {
  return (
    <div className="setup-summary-group">
      <strong>{title}</strong>
      {items.length === 0 ? (
        <span>{labels.setup.noSetup}</span>
      ) : (
        items.map((item) => {
          const itemLabel = render(item);
          const itemDeleteKey = deleteKey({
            kind,
            id: item.id,
            label: itemLabel,
          });
          const isDeleting = pendingDeleteKey === itemDeleteKey;
          return (
            <div className="setup-summary-row" key={item.id}>
              <span>{itemLabel}</span>
              <button
                aria-label={`${labels.actions.delete} ${itemLabel}`}
                className="danger-button setup-delete-button"
                disabled={Boolean(pendingDeleteKey)}
                type="button"
                onClick={() =>
                  onDelete({ kind, id: item.id, label: itemLabel })
                }
              >
                {isDeleting ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

function deleteKey(input: SetupDeleteInput | undefined) {
  return input ? `${input.kind}:${input.id}` : "";
}

function clearDeletedSelection(
  deleted: SetupDeleteInput,
  workspaceSetup: ReturnType<typeof useStoredSetup>[0],
  setWorkspaceSetup: ReturnType<typeof useStoredSetup>[1],
) {
  if (deleted.kind === "branch" && workspaceSetup.branchId === deleted.id) {
    updateSetup(setWorkspaceSetup, {
      branchId: "",
      floorId: "",
      areaId: "",
      floorPlanId: "",
    });
    return;
  }

  if (deleted.kind === "floor" && workspaceSetup.floorId === deleted.id) {
    updateSetup(setWorkspaceSetup, {
      floorId: "",
      areaId: "",
      floorPlanId: "",
    });
    return;
  }

  if (deleted.kind === "area" && workspaceSetup.areaId === deleted.id) {
    updateSetup(setWorkspaceSetup, { areaId: "" });
    return;
  }

  if (
    deleted.kind === "floorPlan" &&
    workspaceSetup.floorPlanId === deleted.id
  ) {
    updateSetup(setWorkspaceSetup, { floorPlanId: "" });
  }
}

function areaTypeLabel(type: RestaurantAreaType) {
  return (
    areaTypeOptions.find((option) => option.value === type)?.label ?? "Otro"
  );
}

function pickId<TItem extends { id: string }>(
  items: TItem[],
  preferredId: string,
) {
  return items.some((item) => item.id === preferredId)
    ? preferredId
    : (items[0]?.id ?? "");
}

function showMutationError(
  error: unknown,
  fallback = labels.toasts.setupCreateFailed,
) {
  if (error instanceof Error) {
    toast.error(fallback, { description: error.message });
    return;
  }

  toast.error(fallback);
}

function trimTime(value: string | null | undefined) {
  return value?.slice(0, 5) ?? "";
}
