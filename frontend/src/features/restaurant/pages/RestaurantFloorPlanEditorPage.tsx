import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Loader2, Map as MapIcon, PenTool, Shapes } from 'lucide-react';
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  getRestaurantContext,
  getRestaurantFloorPlan,
  listRestaurantFloorPlans,
  RestaurantApiError,
  saveRestaurantFloorPlan,
} from '../api/restaurantApi';
import { FloorPlanCanvas } from '../components/FloorPlanCanvas';
import {
  FloorPlanEditorToolbar,
  type FloorPlanEditorTool,
} from '../components/floorPlanEditor/FloorPlanEditorToolbar';
import { FloorPlanPropertiesPanel } from '../components/floorPlanEditor/FloorPlanPropertiesPanel';
import { FloorPlanShapePalette } from '../components/floorPlanEditor/FloorPlanShapePalette';
import { EmptyState, Field, InlineError, PanelHeader, SkeletonRows } from '../components/restaurantUi';
import {
  applyEditorChange,
  changeTableChairCount,
  changeTableShape,
  createFloorPlanEditorState,
  moveTableLayout,
  redoEditorChange,
  resizeTableLayout,
  rotateTableLayout,
  toSaveFloorPlanInput,
  undoEditorChange,
  type FloorPlanEditorState,
} from '../floorPlanEditor';
import labels from '../labels.es.json';
import { restaurantQueryKeys } from '../queryKeys';
import { updateSetup, useStoredSetup, type DragState } from '../state/restaurantWorkspaceState';
import { type RestaurantFloorPlanDetail, type RestaurantTableLayoutDetail } from '../types';

export function RestaurantFloorPlanEditorPage() {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [setup, setSetup] = useStoredSetup();
  const [editorState, setEditorState] = useState<FloorPlanEditorState | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<FloorPlanEditorTool>('select');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [zoom, setZoom] = useState(1);

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

  useEffect(() => {
    if (!floorPlanQuery.data) {
      setEditorState(null);
      setSelectedTableId(null);
      return;
    }

    setEditorState(createFloorPlanEditorState(floorPlanQuery.data));
    setSelectedTableId((current) =>
      current && floorPlanQuery.data.tableLayouts.some((table) => table.tableId === current)
        ? current
        : floorPlanQuery.data.tableLayouts[0]?.tableId ?? null,
    );
  }, [floorPlanQuery.data]);

  const floorPlan = editorState?.floorPlan ?? null;
  const selectedTable = floorPlan?.tableLayouts.find((table) => table.tableId === selectedTableId) ?? null;
  const visibleTables = floorPlan?.tableLayouts.filter((table) => !setup.areaId || table.areaId === setup.areaId) ?? [];
  const emptyStatuses = useMemo(() => new Map(), []);

  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      if (!editorState) {
        throw new Error(labels.states.floorPlanRequired);
      }

      return saveRestaurantFloorPlan(editorState.floorPlan.id, toSaveFloorPlanInput(editorState.floorPlan));
    },
    onSuccess: async (floorPlanDetail) => {
      toast.success(labels.toasts.layoutSaved);
      setEditorState(createFloorPlanEditorState(floorPlanDetail));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: restaurantQueryKeys.floorPlan(floorPlanDetail.id) }),
        queryClient.invalidateQueries({ queryKey: restaurantQueryKeys.floorPlans(floorPlanDetail.branchId, floorPlanDetail.floorId) }),
      ]);
    },
    onError: (error) => showMutationError(error, labels.toasts.layoutFailed),
  });

  function applyFloorPlanChange(change: (floorPlan: RestaurantFloorPlanDetail) => RestaurantFloorPlanDetail) {
    setEditorState((current) => (current ? applyEditorChange(current, change) : current));
  }

  function beginTableDrag(event: ReactPointerEvent<HTMLButtonElement>, tableId: string) {
    if (activeTool !== 'move' || !floorPlan) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedTableId(tableId);
    setDragState({ tableId, startClientX: event.clientX, startClientY: event.clientY });
  }

  function moveTableDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragState || !floorPlan || !canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((event.clientX - dragState.startClientX) / rect.width) * floorPlan.canvasWidth;
    const deltaY = ((event.clientY - dragState.startClientY) / rect.height) * floorPlan.canvasHeight;
    applyFloorPlanChange((current) => moveTableLayout(current, dragState.tableId, deltaX, deltaY));
    setDragState({ ...dragState, startClientX: event.clientX, startClientY: event.clientY });
  }

  function endTableDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragState) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragState(null);
  }

  function handleToolChange(tool: FloorPlanEditorTool) {
    if (tool === 'add-table' || tool === 'add-area') {
      toast.message(labels.editor.setupRequiredForCreation);
      return;
    }

    setActiveTool(tool);
  }

  function changeSelectedTableShape(shape: RestaurantTableLayoutDetail['shape']) {
    if (!selectedTable) {
      return;
    }

    applyFloorPlanChange((current) => changeTableShape(current, selectedTable.tableId, shape, selectedTable.seatLayouts.length || 4));
  }

  return (
    <main className="restaurant-page">
      <header className="restaurant-topbar editor-page-header">
        <div>
          <span className="eyebrow">{labels.app.eyebrow}</span>
          <h1>{labels.sections.floorEditor}</h1>
        </div>
        <div className="topbar-actions">
          {editorState?.isDirty && <span className="dirty-pill">{labels.states.dirty}</span>}
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
            onChange={(event) => updateSetup(setSetup, { branchId: event.target.value, floorPlanId: '' })}
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
      </section>

      <section className="restaurant-module-page editor-workbench" aria-label={labels.sections.floorEditor}>
        <FloorPlanEditorToolbar
          activeTool={activeTool}
          canUndo={Boolean(editorState?.past.length)}
          canRedo={Boolean(editorState?.future.length)}
          canSave={Boolean(editorState?.isDirty)}
          isSaving={saveLayoutMutation.isPending}
          zoom={zoom}
          onToolChange={handleToolChange}
          onSave={() => saveLayoutMutation.mutate()}
          onUndo={() => setEditorState((current) => (current ? undoEditorChange(current) : current))}
          onRedo={() => setEditorState((current) => (current ? redoEditorChange(current) : current))}
          onZoomIn={() => setZoom((current) => Math.min(1.6, current + 0.1))}
          onZoomOut={() => setZoom((current) => Math.max(0.7, current - 0.1))}
          onResetZoom={() => setZoom(1)}
        />

        <div className="editor-layout-grid">
          <section className="panel editor-canvas-panel" aria-labelledby="editor-canvas-heading">
            <PanelHeader icon={<MapIcon size={18} />} title={labels.editor.canvas} />
            {floorPlansQuery.isError && <InlineError error={floorPlansQuery.error} />}
            {floorPlanQuery.isError && <InlineError error={floorPlanQuery.error} />}
            {floorPlanQuery.isPending && setup.floorPlanId && <SkeletonRows count={3} />}
            {floorPlan && (
              <div className="editor-canvas-viewport">
                <div className="editor-canvas-scale" style={{ transform: `scale(${zoom})` }}>
                  <FloorPlanCanvas
                    canvasRef={canvasRef}
                    floorPlan={floorPlan}
                    tables={visibleTables}
                    statuses={emptyStatuses}
                    selectedTableId={selectedTableId}
                    isEditingLayout={activeTool === 'move'}
                    isFetchingStatus={false}
                    onSelectTable={setSelectedTableId}
                    onBeginDrag={beginTableDrag}
                    onMoveDrag={moveTableDrag}
                    onEndDrag={endTableDrag}
                  />
                </div>
              </div>
            )}
            {!setup.floorPlanId && <EmptyState icon={<PenTool size={22} />} title={labels.states.floorPlanRequired} />}
          </section>

          <aside className="side-stack editor-side-stack">
            <section className="panel">
              <PanelHeader icon={<Shapes size={18} />} title={labels.editor.shapePalette} />
              <FloorPlanShapePalette
                selectedShape={selectedTable?.shape ?? null}
                disabled={!selectedTable}
                onSelectShape={changeSelectedTableShape}
              />
            </section>
            <section className="panel">
              <PanelHeader icon={<PenTool size={18} />} title={labels.editor.properties} />
              <FloorPlanPropertiesPanel
                table={selectedTable}
                areas={floorPlan?.areaLayouts ?? []}
                onWidthChange={(width) => selectedTable && applyFloorPlanChange((current) => resizeTableLayout(current, selectedTable.tableId, width, selectedTable.height))}
                onHeightChange={(height) => selectedTable && applyFloorPlanChange((current) => resizeTableLayout(current, selectedTable.tableId, selectedTable.width, height))}
                onRotationChange={(rotation) => selectedTable && applyFloorPlanChange((current) => rotateTableLayout(current, selectedTable.tableId, rotation))}
                onChairCountChange={(chairCount) =>
                  selectedTable && applyFloorPlanChange((current) => changeTableChairCount(current, selectedTable.tableId, chairCount))
                }
              />
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function showMutationError(error: unknown, title: string) {
  if (error instanceof RestaurantApiError) {
    toast.error(title, { description: error.message });
    return;
  }

  toast.error(title);
}
