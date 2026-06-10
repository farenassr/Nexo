import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Loader2,
  Map as MapIcon,
  PenTool,
  Shapes,
} from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  useNexoServerModulesRestaurantFeaturesFloorPlansGetDetailsGetRestaurantFloorPlanEndpoint,
  useNexoServerModulesRestaurantFeaturesFloorPlansListListRestaurantFloorPlansEndpoint,
  useNexoServerModulesRestaurantFeaturesFloorPlansSaveSaveRestaurantFloorPlanEndpoint,
  useNexoServerModulesRestaurantFeaturesGetContextRestaurantContextEndpoint,
  useNexoServerModulesRestaurantFeaturesSetupGetRestaurantSetupEndpoint,
} from "../../../lib/api/generated/hooks";
import { invalidateRestaurantSetup } from "../api/restaurantQueryInvalidation";
import { FloorPlanCanvas } from "../components/FloorPlanCanvas";
import {
  FloorPlanEditorToolbar,
  type FloorPlanEditorTool,
} from "../components/floorPlanEditor/FloorPlanEditorToolbar";
import { FloorPlanPropertiesPanel } from "../components/floorPlanEditor/FloorPlanPropertiesPanel";
import { FloorPlanShapePalette } from "../components/floorPlanEditor/FloorPlanShapePalette";
import {
  EmptyState,
  Field,
  InlineError,
  PanelHeader,
  SkeletonRows,
} from "../components/restaurantUi";
import {
  applyEditorChange,
  addAreaLayoutFromSetup,
  addTableLayoutFromSetup,
  changeTableChairCount,
  changeTableShape,
  createFloorPlanEditorState,
  moveAreaLayout,
  moveTableLayout,
  redoEditorChange,
  resizeTableLayout,
  rotateTableLayout,
  toSaveFloorPlanInput,
  undoEditorChange,
  type FloorPlanEditorState,
} from "../floorPlanEditor";
import labels from "../labels.es.json";
import {
  isGuid,
  updateSetup,
  useRestaurantWorkspaceStore,
  useStoredSetup,
  type DragState,
} from "../state/restaurantWorkspaceState";
import {
  type RestaurantFloorPlanDetail,
  type RestaurantTableLayoutDetail,
} from "../types";

export function RestaurantFloorPlanEditorPage() {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [setup, setSetup] = useStoredSetup();
  const [editorState, setEditorState] = useState<FloorPlanEditorState | null>(
    null,
  );
  const selectedTableId = useRestaurantWorkspaceStore(
    (state) => state.selectedTableId,
  );
  const setSelectedTableId = useRestaurantWorkspaceStore(
    (state) => state.setSelectedTableId,
  );
  const clearSelectedTableId = useRestaurantWorkspaceStore(
    (state) => state.clearSelectedTableId,
  );
  const [activeTool, setActiveTool] = useState<FloorPlanEditorTool>("select");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [zoom, setZoom] = useState(1);

  const hasFloorContext = isGuid(setup.branchId) && isGuid(setup.floorId);

  const contextQuery =
    useNexoServerModulesRestaurantFeaturesGetContextRestaurantContextEndpoint();

  const floorPlansQuery =
    useNexoServerModulesRestaurantFeaturesFloorPlansListListRestaurantFloorPlansEndpoint(
      { params: { branchId: setup.branchId, floorId: setup.floorId } },
      { query: { enabled: hasFloorContext } },
    );

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

    const nextBranchId = setupQuery.data.branches.some(
      (branch) => branch.id === setup.branchId,
    )
      ? setup.branchId
      : (setupQuery.data.branches[0]?.id ?? "");
    const nextFloors = setupQuery.data.floors.filter(
      (floor) => floor.branchId === nextBranchId,
    );
    const nextFloorId = nextFloors.some((floor) => floor.id === setup.floorId)
      ? setup.floorId
      : (nextFloors[0]?.id ?? "");

    if (nextBranchId !== setup.branchId || nextFloorId !== setup.floorId) {
      updateSetup(setSetup, {
        branchId: nextBranchId,
        floorId: nextFloorId,
        floorPlanId: "",
        areaId: "",
      });
    }
  }, [setSetup, setup.branchId, setup.floorId, setupQuery.data]);

  useEffect(() => {
    if (!floorPlanQuery.data) {
      setEditorState(null);
      clearSelectedTableId();
      return;
    }

    setEditorState(createFloorPlanEditorState(floorPlanQuery.data));
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

  const floorPlan = editorState?.floorPlan ?? null;
  const selectedTable =
    floorPlan?.tableLayouts.find(
      (table) => table.tableId === selectedTableId,
    ) ?? null;
  const visibleTables =
    floorPlan?.tableLayouts.filter(
      (table) => !setup.areaId || table.areaId === setup.areaId,
    ) ?? [];
  const emptyStatuses = useMemo(() => new Map(), []);

  const saveLayoutMutation =
    useNexoServerModulesRestaurantFeaturesFloorPlansSaveSaveRestaurantFloorPlanEndpoint(
      {
        mutation: {
          onSuccess: async (floorPlanDetail) => {
            toast.success(labels.toasts.layoutSaved);
            setEditorState(createFloorPlanEditorState(floorPlanDetail));
            await invalidateRestaurantSetup(queryClient);
          },
          onError: (error) =>
            showMutationError(error, labels.toasts.layoutFailed),
        },
      },
    );

  function applyFloorPlanChange(
    change: (floorPlan: RestaurantFloorPlanDetail) => RestaurantFloorPlanDetail,
  ) {
    setEditorState((current) =>
      current ? applyEditorChange(current, change) : current,
    );
  }

  function beginTableDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    tableId: string,
  ) {
    if (activeTool !== "move" || !floorPlan) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedTableId(tableId);
    setDragState({
      itemKind: "table",
      itemId: tableId,
      startClientX: event.clientX,
      startClientY: event.clientY,
    });
  }

  function beginAreaDrag(
    event: ReactPointerEvent<HTMLDivElement>,
    areaId: string,
  ) {
    if (activeTool !== "move" || !floorPlan) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      itemKind: "area",
      itemId: areaId,
      startClientX: event.clientX,
      startClientY: event.clientY,
    });
  }

  function moveLayoutDrag(
    event: ReactPointerEvent<HTMLButtonElement | HTMLDivElement>,
  ) {
    if (!dragState || !floorPlan || !canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX =
      ((event.clientX - dragState.startClientX) / rect.width) *
      floorPlan.canvasWidth;
    const deltaY =
      ((event.clientY - dragState.startClientY) / rect.height) *
      floorPlan.canvasHeight;
    applyFloorPlanChange((current) =>
      dragState.itemKind === "area"
        ? moveAreaLayout(current, dragState.itemId, deltaX, deltaY)
        : moveTableLayout(current, dragState.itemId, deltaX, deltaY),
    );
    setDragState({
      ...dragState,
      startClientX: event.clientX,
      startClientY: event.clientY,
    });
  }

  function endLayoutDrag(
    event: ReactPointerEvent<HTMLButtonElement | HTMLDivElement>,
  ) {
    if (dragState) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragState(null);
  }

  function handleToolChange(tool: FloorPlanEditorTool) {
    if (tool === "add-area") {
      addNextSetupAreaLayout();
      return;
    }

    if (tool === "add-table") {
      addNextSetupTableLayout();
      return;
    }

    setActiveTool(tool);
  }

  function addNextSetupAreaLayout() {
    if (!editorState || !isGuid(setup.branchId) || !isGuid(setup.floorId)) {
      toast.message(labels.editor.setupRequiredForCreation);
      return;
    }

    const nextArea = setupQuery.data?.areas.find(
      (area) =>
        area.branchId === setup.branchId &&
        area.floorId === setup.floorId &&
        !editorState.floorPlan.areaLayouts.some(
          (layout) => layout.areaId === area.id,
        ),
    );

    if (!nextArea) {
      toast.message(labels.editor.noSetupAreasAvailable);
      return;
    }

    setEditorState((current) =>
      current
        ? applyEditorChange(current, (floorPlanDetail) =>
            addAreaLayoutFromSetup(floorPlanDetail, nextArea),
          )
        : current,
    );
    updateSetup(setSetup, { areaId: nextArea.id });
    setActiveTool("select");
  }

  function addNextSetupTableLayout() {
    if (!editorState || !isGuid(setup.branchId) || !isGuid(setup.floorId)) {
      toast.message(labels.editor.setupRequiredForCreation);
      return;
    }

    const nextTable = setupQuery.data?.tables.find(
      (table) =>
        table.branchId === setup.branchId &&
        table.floorId === setup.floorId &&
        (!setup.areaId || table.areaId === setup.areaId) &&
        !editorState.floorPlan.tableLayouts.some(
          (layout) => layout.tableId === table.id,
        ),
    );

    if (!nextTable) {
      toast.message(labels.editor.noSetupTablesAvailable);
      return;
    }

    setEditorState((current) =>
      current
        ? applyEditorChange(current, (floorPlanDetail) =>
            addTableLayoutFromSetup(floorPlanDetail, nextTable),
          )
        : current,
    );
    setSelectedTableId(nextTable.id);
    setActiveTool("move");
  }

  function changeSelectedTableShape(
    shape: RestaurantTableLayoutDetail["shape"],
  ) {
    if (!selectedTable) {
      return;
    }

    applyFloorPlanChange((current) =>
      changeTableShape(
        current,
        selectedTable.tableId,
        shape,
        selectedTable.seatLayouts.length || 4,
      ),
    );
  }

  return (
    <main className="restaurant-page">
      <header className="restaurant-topbar editor-page-header">
        <div>
          <span className="eyebrow">{labels.app.eyebrow}</span>
          <h1>{labels.sections.floorEditor}</h1>
        </div>
        <div className="topbar-actions">
          {editorState?.isDirty && (
            <span className="dirty-pill">{labels.states.dirty}</span>
          )}
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

      <section className="setup-panel" aria-label={labels.app.contextFallback}>
        <Field label={labels.setup.branchId}>
          <select
            value={setup.branchId}
            onChange={(event) =>
              updateSetup(setSetup, {
                branchId: event.target.value,
                floorId: "",
                floorPlanId: "",
                areaId: "",
              })
            }
            disabled={setupQuery.isPending || setupBranches.length === 0}
          >
            <option value="">{labels.states.branchRequired}</option>
            {setupBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={labels.setup.floorId}>
          <select
            value={setup.floorId}
            onChange={(event) =>
              updateSetup(setSetup, {
                floorId: event.target.value,
                floorPlanId: "",
                areaId: "",
              })
            }
            disabled={!setup.branchId || setupFloors.length === 0}
          >
            <option value="">{labels.states.floorRequired}</option>
            {setupFloors.map((floor) => (
              <option key={floor.id} value={floor.id}>
                {floor.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={labels.setup.floorPlan}>
          <select
            value={setup.floorPlanId}
            onChange={(event) =>
              updateSetup(setSetup, {
                floorPlanId: event.target.value,
                areaId: "",
              })
            }
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
          <select
            value={setup.areaId}
            onChange={(event) =>
              updateSetup(setSetup, { areaId: event.target.value })
            }
          >
            <option value="">{labels.setup.allAreas}</option>
            {floorPlan?.areaLayouts.map((area) => (
              <option key={area.areaId} value={area.areaId}>
                {area.areaName}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section
        className="restaurant-module-page editor-workbench"
        aria-label={labels.sections.floorEditor}
      >
        <FloorPlanEditorToolbar
          activeTool={activeTool}
          canUndo={Boolean(editorState?.past.length)}
          canRedo={Boolean(editorState?.future.length)}
          canSave={Boolean(editorState?.isDirty)}
          isSaving={saveLayoutMutation.isPending}
          zoom={zoom}
          onToolChange={handleToolChange}
          onSave={() => {
            if (!editorState) {
              toast.error(labels.toasts.layoutFailed, {
                description: labels.states.floorPlanRequired,
              });
              return;
            }

            saveLayoutMutation.mutate({
              floorPlanId: editorState.floorPlan.id,
              data: toSaveFloorPlanInput(editorState.floorPlan),
            });
          }}
          onUndo={() =>
            setEditorState((current) =>
              current ? undoEditorChange(current) : current,
            )
          }
          onRedo={() =>
            setEditorState((current) =>
              current ? redoEditorChange(current) : current,
            )
          }
          onZoomIn={() => setZoom((current) => Math.min(1.6, current + 0.1))}
          onZoomOut={() => setZoom((current) => Math.max(0.7, current - 0.1))}
          onResetZoom={() => setZoom(1)}
        />

        <div className="editor-layout-grid">
          <section
            className="panel editor-canvas-panel"
            aria-labelledby="editor-canvas-heading"
          >
            <PanelHeader
              icon={<MapIcon size={18} />}
              title={labels.editor.canvas}
            />
            {floorPlansQuery.isError && (
              <InlineError error={floorPlansQuery.error} />
            )}
            {floorPlanQuery.isError && (
              <InlineError error={floorPlanQuery.error} />
            )}
            {floorPlanQuery.isPending && setup.floorPlanId && (
              <SkeletonRows count={3} />
            )}
            {floorPlan && (
              <div className="editor-canvas-viewport">
                <div
                  className="editor-canvas-scale"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <FloorPlanCanvas
                    canvasRef={canvasRef}
                    floorPlan={floorPlan}
                    tables={visibleTables}
                    statuses={emptyStatuses}
                    selectedTableId={selectedTableId}
                    isEditingLayout={activeTool === "move"}
                    isFetchingStatus={false}
                    onSelectTable={setSelectedTableId}
                    onBeginAreaDrag={beginAreaDrag}
                    onBeginDrag={beginTableDrag}
                    onMoveDrag={moveLayoutDrag}
                    onEndDrag={endLayoutDrag}
                  />
                </div>
              </div>
            )}
            {!setup.floorPlanId && (
              <EmptyState
                icon={<PenTool size={22} />}
                title={labels.states.floorPlanRequired}
              />
            )}
          </section>

          <aside className="side-stack editor-side-stack">
            <section className="panel">
              <PanelHeader
                icon={<Shapes size={18} />}
                title={labels.editor.shapePalette}
              />
              <FloorPlanShapePalette
                selectedShape={selectedTable?.shape ?? null}
                disabled={!selectedTable}
                onSelectShape={changeSelectedTableShape}
              />
            </section>
            <section className="panel">
              <PanelHeader
                icon={<PenTool size={18} />}
                title={labels.editor.properties}
              />
              <FloorPlanPropertiesPanel
                table={selectedTable}
                areas={floorPlan?.areaLayouts ?? []}
                onWidthChange={(width) =>
                  selectedTable &&
                  applyFloorPlanChange((current) =>
                    resizeTableLayout(
                      current,
                      selectedTable.tableId,
                      width,
                      selectedTable.height,
                    ),
                  )
                }
                onHeightChange={(height) =>
                  selectedTable &&
                  applyFloorPlanChange((current) =>
                    resizeTableLayout(
                      current,
                      selectedTable.tableId,
                      selectedTable.width,
                      height,
                    ),
                  )
                }
                onRotationChange={(rotation) =>
                  selectedTable &&
                  applyFloorPlanChange((current) =>
                    rotateTableLayout(current, selectedTable.tableId, rotation),
                  )
                }
                onChairCountChange={(chairCount) =>
                  selectedTable &&
                  applyFloorPlanChange((current) =>
                    changeTableChairCount(
                      current,
                      selectedTable.tableId,
                      chairCount,
                    ),
                  )
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
  if (error instanceof Error) {
    toast.error(title, { description: error.message });
    return;
  }

  toast.error(title);
}
