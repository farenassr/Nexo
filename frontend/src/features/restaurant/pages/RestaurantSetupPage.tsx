import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Building2, Grid3X3, Layers, Loader2, Map, Settings, Trash2, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import {
  createRestaurantArea,
  createRestaurantBranch,
  createRestaurantFloor,
  createRestaurantFloorPlan,
  createRestaurantTable,
  deleteRestaurantArea,
  deleteRestaurantBranch,
  deleteRestaurantFloor,
  deleteRestaurantFloorPlan,
  deleteRestaurantTable,
  getRestaurantSetup,
} from '../api/restaurantApi';
import { EmptyState, Field, InlineError, Metric, PanelHeader, SkeletonRows } from '../components/restaurantUi';
import labels from '../labels.es.json';
import { restaurantQueryKeys } from '../queryKeys';
import { optionalText, updateSetup, useStoredSetup } from '../state/restaurantWorkspaceState';
import {
  RestaurantAreaType,
  RestaurantTableShape,
  type RestaurantAreaDetail,
  type RestaurantBranchDetail,
  type RestaurantFloorDetail,
  type RestaurantFloorPlanSummary,
  type RestaurantSetupSnapshot,
  type RestaurantTableDetail,
} from '../types';

const areaTypeOptions = [
  { value: RestaurantAreaType.DiningRoom, label: 'Comedor' },
  { value: RestaurantAreaType.Terrace, label: 'Terraza' },
  { value: RestaurantAreaType.Bar, label: 'Bar' },
  { value: RestaurantAreaType.PrivateRoom, label: 'Privado' },
  { value: RestaurantAreaType.Outdoor, label: 'Exterior' },
  { value: RestaurantAreaType.Takeaway, label: 'Takeaway' },
  { value: RestaurantAreaType.Other, label: 'Otro' },
] as const;

const shapeOptions = [
  { value: RestaurantTableShape.Round, label: labels.shapes.round },
  { value: RestaurantTableShape.Square, label: labels.shapes.square },
  { value: RestaurantTableShape.Rectangle, label: labels.shapes.rectangle },
  { value: RestaurantTableShape.Booth, label: labels.shapes.booth },
  { value: RestaurantTableShape.Bar, label: labels.shapes.bar },
] as const;

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

type SetupDeleteKind = 'branch' | 'floor' | 'area' | 'table' | 'floorPlan';

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
    address: '',
    timeZone: 'UTC',
  });
  const [floorForm, setFloorForm] = useState({ branchId: '', name: labels.setup.mainFloor, sortOrder: 1 });
  const [areaForm, setAreaForm] = useState<AreaFormState>({
    branchId: '',
    floorId: '',
    name: labels.setup.mainArea,
    type: RestaurantAreaType.DiningRoom,
    sortOrder: 1,
  });
  const [tableForm, setTableForm] = useState<TableFormState>({
    branchId: '',
    floorId: '',
    areaId: '',
    label: 'A1',
    minCapacity: 2,
    maxCapacity: 4,
    defaultReservationMinutes: 90,
    shape: RestaurantTableShape.Rectangle,
  });
  const [floorPlanForm, setFloorPlanForm] = useState<FloorPlanFormState>({
    branchId: '',
    floorId: '',
    name: labels.setup.mainPlan,
    canvasWidth: 1200,
    canvasHeight: 760,
    gridSize: 20,
    isActive: true,
  });

  const setupQuery = useQuery({
    queryKey: restaurantQueryKeys.setup(),
    queryFn: getRestaurantSetup,
  });

  const snapshot = setupQuery.data;
  const branches = snapshot?.branches ?? [];
  const floors = snapshot?.floors ?? [];
  const areas = snapshot?.areas ?? [];

  const selectedBranchId = pickId(branches, workspaceSetup.branchId);
  const selectedFloorId = pickId(
    floors.filter((floor) => !selectedBranchId || floor.branchId === selectedBranchId),
    workspaceSetup.floorId,
  );

  const floorBranchId = floorForm.branchId || selectedBranchId;
  const areaBranchId = areaForm.branchId || selectedBranchId;
  const areaFloors = floors.filter((floor) => floor.branchId === areaBranchId);
  const areaFloorId = areaForm.floorId || pickId(areaFloors, selectedFloorId);
  const tableBranchId = tableForm.branchId || selectedBranchId;
  const tableFloors = floors.filter((floor) => floor.branchId === tableBranchId);
  const tableFloorId = tableForm.floorId || pickId(tableFloors, selectedFloorId);
  const tableAreas = areas.filter((area) => area.branchId === tableBranchId && area.floorId === tableFloorId);
  const floorPlanBranchId = floorPlanForm.branchId || selectedBranchId;
  const floorPlanFloors = floors.filter((floor) => floor.branchId === floorPlanBranchId);
  const floorPlanFloorId = floorPlanForm.floorId || pickId(floorPlanFloors, selectedFloorId);

  const branchMutation = useMutation({
    mutationFn: createRestaurantBranch,
    onSuccess: async (branch) => {
      updateSetup(setWorkspaceSetup, { branchId: branch.id, floorId: '', areaId: '', floorPlanId: '' });
      setFloorForm((current) => ({ ...current, branchId: branch.id }));
      setBranchForm({ name: labels.setup.mainBranch, address: '', timeZone: 'UTC' });
      toast.success(labels.toasts.setupCreated);
      await invalidateSetup(queryClient);
    },
    onError: (error) => showMutationError(error),
  });

  const floorMutation = useMutation({
    mutationFn: createRestaurantFloor,
    onSuccess: async (floor) => {
      updateSetup(setWorkspaceSetup, { branchId: floor.branchId, floorId: floor.id, areaId: '', floorPlanId: '' });
      setAreaForm((current) => ({ ...current, branchId: floor.branchId, floorId: floor.id }));
      setFloorPlanForm((current) => ({ ...current, branchId: floor.branchId, floorId: floor.id }));
      toast.success(labels.toasts.setupCreated);
      await invalidateSetup(queryClient);
    },
    onError: (error) => showMutationError(error),
  });

  const areaMutation = useMutation({
    mutationFn: createRestaurantArea,
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
      await invalidateSetup(queryClient);
    },
    onError: (error) => showMutationError(error),
  });

  const tableMutation = useMutation({
    mutationFn: createRestaurantTable,
    onSuccess: async (table) => {
      updateSetup(setWorkspaceSetup, {
        branchId: table.branchId,
        floorId: table.floorId,
        areaId: table.areaId ?? '',
      });
      toast.success(labels.toasts.setupCreated);
      await invalidateSetup(queryClient);
    },
    onError: (error) => showMutationError(error),
  });

  const floorPlanMutation = useMutation({
    mutationFn: createRestaurantFloorPlan,
    onSuccess: async (floorPlan) => {
      updateSetup(setWorkspaceSetup, {
        branchId: floorPlan.branchId,
        floorId: floorPlan.floorId,
        floorPlanId: floorPlan.id,
      });
      toast.success(labels.toasts.setupCreated);
      await invalidateSetup(queryClient);
    },
    onError: (error) => showMutationError(error),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ kind, id }: SetupDeleteInput) => {
      switch (kind) {
        case 'branch':
          await deleteRestaurantBranch(id);
          return;
        case 'floor':
          await deleteRestaurantFloor(id);
          return;
        case 'area':
          await deleteRestaurantArea(id);
          return;
        case 'table':
          await deleteRestaurantTable(id);
          return;
        case 'floorPlan':
          await deleteRestaurantFloorPlan(id);
          return;
      }
    },
    onSuccess: async (_, deleted) => {
      clearDeletedSelection(deleted, workspaceSetup, setWorkspaceSetup);
      toast.success(labels.toasts.setupDeleted);
      await invalidateSetup(queryClient);
    },
    onError: (error) => showMutationError(error, labels.toasts.setupDeleteFailed),
  });

  const metrics = useMemo(
    () => [
      { label: labels.setup.branches, value: snapshot?.branches.length ?? 0 },
      { label: labels.setup.floors, value: snapshot?.floors.length ?? 0 },
      { label: labels.setup.areas, value: snapshot?.areas.length ?? 0 },
      { label: labels.setup.tables, value: snapshot?.tables.length ?? 0 },
      { label: labels.setup.floorPlans, value: snapshot?.floorPlans.length ?? 0 },
    ],
    [snapshot],
  );

  function onCreateBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    branchMutation.mutate({
      name: branchForm.name.trim(),
      address: optionalText(branchForm.address),
      timeZone: branchForm.timeZone.trim() || 'UTC',
    });
  }

  function onCreateFloor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!floorBranchId) {
      return;
    }
    floorMutation.mutate({
      branchId: floorBranchId,
      name: floorForm.name.trim(),
      sortOrder: floorForm.sortOrder,
    });
  }

  function onCreateArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!areaBranchId || !areaFloorId) {
      return;
    }
    areaMutation.mutate({
      branchId: areaBranchId,
      floorId: areaFloorId,
      name: areaForm.name.trim(),
      type: areaForm.type,
      sortOrder: areaForm.sortOrder,
    });
  }

  function onCreateTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tableBranchId || !tableFloorId) {
      return;
    }
    tableMutation.mutate({
      branchId: tableBranchId,
      floorId: tableFloorId,
      areaId: tableForm.areaId || null,
      label: tableForm.label.trim(),
      minCapacity: tableForm.minCapacity,
      maxCapacity: tableForm.maxCapacity,
      defaultReservationMinutes: tableForm.defaultReservationMinutes,
      shape: tableForm.shape,
    });
  }

  function onCreateFloorPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!floorPlanBranchId || !floorPlanFloorId) {
      return;
    }
    floorPlanMutation.mutate({
      branchId: floorPlanBranchId,
      floorId: floorPlanFloorId,
      name: floorPlanForm.name.trim(),
      canvasWidth: floorPlanForm.canvasWidth,
      canvasHeight: floorPlanForm.canvasHeight,
      gridSize: floorPlanForm.gridSize,
      isActive: floorPlanForm.isActive,
    });
  }

  function onDeleteSetupItem(input: SetupDeleteInput) {
    if (!window.confirm(labels.setup.confirmDelete.replace('{name}', input.label))) {
      return;
    }

    deleteMutation.mutate(input);
  }

  return (
    <main className="restaurant-page">
      <section className="restaurant-module-page">
        <PanelHeader icon={<Settings size={18} />} title={labels.sections.setup} />
        {setupQuery.isLoading ? (
          <SkeletonRows count={2} />
        ) : setupQuery.isError ? (
          <InlineError error={setupQuery.error} />
        ) : (
          <div className="setup-metric-grid">
            {metrics.map((metric) => (
              <Metric key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </div>
        )}
      </section>

      <div className="setup-workbench">
        <section className="panel setup-form-panel">
          <PanelHeader icon={<Building2 size={18} />} title={labels.setup.createBranch} />
          <form className="booking-form" onSubmit={onCreateBranch}>
            <Field label={labels.setup.name}>
              <input
                required
                value={branchForm.name}
                onChange={(event) => setBranchForm((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>
            <Field label={labels.setup.address}>
              <input
                value={branchForm.address}
                onChange={(event) => setBranchForm((current) => ({ ...current, address: event.target.value }))}
              />
            </Field>
            <Field label={labels.setup.timeZone}>
              <input
                required
                value={branchForm.timeZone}
                onChange={(event) => setBranchForm((current) => ({ ...current, timeZone: event.target.value }))}
              />
            </Field>
            <SubmitButton isPending={branchMutation.isPending} label={labels.setup.createBranch} />
          </form>
        </section>

        <section className="panel setup-form-panel">
          <PanelHeader icon={<Layers size={18} />} title={labels.setup.createFloor} />
          <form className="booking-form" onSubmit={onCreateFloor}>
            <BranchSelect
              branches={branches}
              value={floorBranchId}
              onChange={(branchId) => setFloorForm((current) => ({ ...current, branchId }))}
            />
            <Field label={labels.setup.name}>
              <input
                required
                value={floorForm.name}
                onChange={(event) => setFloorForm((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>
            <Field label={labels.setup.sortOrder}>
              <NumberInput
                min={0}
                value={floorForm.sortOrder}
                onChange={(sortOrder) => setFloorForm((current) => ({ ...current, sortOrder }))}
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
          <PanelHeader icon={<Grid3X3 size={18} />} title={labels.setup.createArea} />
          <form className="booking-form" onSubmit={onCreateArea}>
            <BranchSelect
              branches={branches}
              value={areaBranchId}
              onChange={(branchId) => setAreaForm((current) => ({ ...current, branchId, floorId: '' }))}
            />
            <FloorSelect
              floors={areaFloors}
              value={areaFloorId}
              onChange={(floorId) => setAreaForm((current) => ({ ...current, floorId }))}
            />
            <div className="form-row">
              <Field label={labels.setup.name}>
                <input
                  required
                  value={areaForm.name}
                  onChange={(event) => setAreaForm((current) => ({ ...current, name: event.target.value }))}
                />
              </Field>
              <Field label={labels.setup.areaType}>
                <select
                  value={areaForm.type}
                  onChange={(event) => setAreaForm((current) => ({ ...current, type: Number(event.target.value) as RestaurantAreaType }))}
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
                onChange={(sortOrder) => setAreaForm((current) => ({ ...current, sortOrder }))}
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
          <PanelHeader icon={<Utensils size={18} />} title={labels.setup.createTable} />
          <form className="booking-form" onSubmit={onCreateTable}>
            <BranchSelect
              branches={branches}
              value={tableBranchId}
              onChange={(branchId) => setTableForm((current) => ({ ...current, branchId, floorId: '', areaId: '' }))}
            />
            <FloorSelect
              floors={tableFloors}
              value={tableFloorId}
              onChange={(floorId) => setTableForm((current) => ({ ...current, floorId, areaId: '' }))}
            />
            <Field label={labels.setup.area}>
              <select
                value={tableForm.areaId}
                onChange={(event) => setTableForm((current) => ({ ...current, areaId: event.target.value }))}
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
                  onChange={(event) => setTableForm((current) => ({ ...current, label: event.target.value }))}
                />
              </Field>
              <Field label={labels.fields.shape}>
                <select
                  value={tableForm.shape}
                  onChange={(event) => setTableForm((current) => ({ ...current, shape: Number(event.target.value) as RestaurantTableShape }))}
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
                  onChange={(maxCapacity) => setTableForm((current) => ({ ...current, maxCapacity }))}
                />
              </Field>
            </div>
            <Field label={labels.setup.defaultDuration}>
              <NumberInput
                min={15}
                value={tableForm.defaultReservationMinutes}
                onChange={(defaultReservationMinutes) =>
                  setTableForm((current) => ({ ...current, defaultReservationMinutes }))
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
          <PanelHeader icon={<Map size={18} />} title={labels.setup.createFloorPlan} />
          <form className="booking-form" onSubmit={onCreateFloorPlan}>
            <BranchSelect
              branches={branches}
              value={floorPlanBranchId}
              onChange={(branchId) => setFloorPlanForm((current) => ({ ...current, branchId, floorId: '' }))}
            />
            <FloorSelect
              floors={floorPlanFloors}
              value={floorPlanFloorId}
              onChange={(floorId) => setFloorPlanForm((current) => ({ ...current, floorId }))}
            />
            <Field label={labels.setup.name}>
              <input
                required
                value={floorPlanForm.name}
                onChange={(event) => setFloorPlanForm((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>
            <div className="form-row">
              <Field label={labels.fields.width}>
                <NumberInput
                  min={400}
                  value={floorPlanForm.canvasWidth}
                  onChange={(canvasWidth) => setFloorPlanForm((current) => ({ ...current, canvasWidth }))}
                />
              </Field>
              <Field label={labels.fields.height}>
                <NumberInput
                  min={300}
                  value={floorPlanForm.canvasHeight}
                  onChange={(canvasHeight) => setFloorPlanForm((current) => ({ ...current, canvasHeight }))}
                />
              </Field>
            </div>
            <Field label={labels.setup.gridSize}>
              <NumberInput
                min={0}
                value={floorPlanForm.gridSize}
                onChange={(gridSize) => setFloorPlanForm((current) => ({ ...current, gridSize: gridSize || null }))}
              />
            </Field>
            <label className="editor-check-row">
              <input
                checked={floorPlanForm.isActive}
                type="checkbox"
                onChange={(event) => setFloorPlanForm((current) => ({ ...current, isActive: event.target.checked }))}
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
          <PanelHeader icon={<Settings size={18} />} title={labels.setup.currentSetup} />
          {setupQuery.isLoading ? (
            <SkeletonRows count={4} />
          ) : setupQuery.isError ? (
            <InlineError error={setupQuery.error} />
          ) : snapshot ? (
            <SetupSummary
              pendingDeleteKey={deleteMutation.isPending ? deleteKey(deleteMutation.variables) : ''}
              snapshot={snapshot}
              onDelete={onDeleteSetupItem}
            />
          ) : (
            <EmptyState icon={<Settings size={20} />} title={labels.setup.noSetup} />
          )}
        </section>
      </div>
    </main>
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
      <select required value={value} onChange={(event) => onChange(event.target.value)}>
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
      <select required value={value} onChange={(event) => onChange(event.target.value)}>
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
      value={value ?? ''}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

function SubmitButton({ disabled = false, isPending, label }: { disabled?: boolean; isPending: boolean; label: string }) {
  return (
    <button className="primary-button" disabled={disabled || isPending} type="submit">
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
    return <EmptyState icon={<Settings size={20} />} title={labels.setup.noSetup} />;
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
        render={(table) => `${table.label} / ${table.minCapacity}-${table.maxCapacity}`}
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

function SummaryGroup<TItem extends RestaurantAreaDetail | RestaurantBranchDetail | RestaurantFloorDetail | RestaurantFloorPlanSummary | RestaurantTableDetail>({
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
          const itemDeleteKey = deleteKey({ kind, id: item.id, label: itemLabel });
          const isDeleting = pendingDeleteKey === itemDeleteKey;
          return (
            <div className="setup-summary-row" key={item.id}>
              <span>{itemLabel}</span>
              <button
                aria-label={`${labels.actions.delete} ${itemLabel}`}
                className="danger-button setup-delete-button"
                disabled={Boolean(pendingDeleteKey)}
                type="button"
                onClick={() => onDelete({ kind, id: item.id, label: itemLabel })}
              >
                {isDeleting ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

function deleteKey(input: SetupDeleteInput | undefined) {
  return input ? `${input.kind}:${input.id}` : '';
}

function clearDeletedSelection(
  deleted: SetupDeleteInput,
  workspaceSetup: ReturnType<typeof useStoredSetup>[0],
  setWorkspaceSetup: ReturnType<typeof useStoredSetup>[1],
) {
  if (deleted.kind === 'branch' && workspaceSetup.branchId === deleted.id) {
    updateSetup(setWorkspaceSetup, { branchId: '', floorId: '', areaId: '', floorPlanId: '' });
    return;
  }

  if (deleted.kind === 'floor' && workspaceSetup.floorId === deleted.id) {
    updateSetup(setWorkspaceSetup, { floorId: '', areaId: '', floorPlanId: '' });
    return;
  }

  if (deleted.kind === 'area' && workspaceSetup.areaId === deleted.id) {
    updateSetup(setWorkspaceSetup, { areaId: '' });
    return;
  }

  if (deleted.kind === 'floorPlan' && workspaceSetup.floorPlanId === deleted.id) {
    updateSetup(setWorkspaceSetup, { floorPlanId: '' });
  }
}

function areaTypeLabel(type: RestaurantAreaType) {
  return areaTypeOptions.find((option) => option.value === type)?.label ?? 'Otro';
}

function pickId<TItem extends { id: string }>(items: TItem[], preferredId: string) {
  return items.some((item) => item.id === preferredId) ? preferredId : (items[0]?.id ?? '');
}

async function invalidateSetup(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: restaurantQueryKeys.setup() }),
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'floor-plans'] }),
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'floor-plan'] }),
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'floor-plan-status-map'] }),
    queryClient.invalidateQueries({ queryKey: ['restaurant', 'reservation-filters'] }),
  ]);
}

function showMutationError(error: unknown, fallback = labels.toasts.setupCreateFailed) {
  if (error instanceof Error) {
    toast.error(fallback, { description: error.message });
    return;
  }

  toast.error(fallback);
}
