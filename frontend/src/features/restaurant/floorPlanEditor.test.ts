import { describe, expect, it } from 'vitest';
import { RestaurantTableShape, type RestaurantFloorPlanDetail } from './types';
import {
  addAreaLayoutFromSetup,
  addTableLayoutFromSetup,
  applyEditorChange,
  buildSeatLayouts,
  changeTableShape,
  createFloorPlanEditorState,
  moveAreaLayout,
  moveTableLayout,
  resizeTableLayout,
  toSaveFloorPlanInput,
  undoEditorChange,
} from './floorPlanEditor';

describe('floorPlanEditor', () => {
  it('moves table layouts by canvas delta and clamps them inside the floor plan', () => {
    const floorPlan = floorPlanFixture();

    const moved = moveTableLayout(floorPlan, 'table-1', 950, 720);

    expect(moved.tableLayouts[0]).toMatchObject({
      tableId: 'table-1',
      x: 1100,
      y: 680,
    });
  });

  it('moves area layouts by canvas delta and clamps them inside the floor plan', () => {
    const floorPlan = floorPlanFixture();

    const moved = moveAreaLayout(floorPlan, 'area-1', 900, 600);

    expect(moved.areaLayouts[0]).toMatchObject({
      areaId: 'area-1',
      x: 680,
      y: 440,
    });
  });

  it('marks editor state dirty when a layout edit changes the floor plan', () => {
    const floorPlan = floorPlanFixture();

    const moved = applyEditorChange(createFloorPlanEditorState(floorPlan), (draft) => resizeTableLayout(draft, 'table-1', 180, 120));

    expect(moved.floorPlan.tableLayouts[0]).toMatchObject({
      tableId: 'table-1',
      width: 180,
      height: 120,
    });
    expect(moved.isDirty).toBe(true);
    expect(moved.past).toHaveLength(1);
  });

  it('resizes table layouts without letting them overflow the canvas', () => {
    const floorPlan = floorPlanFixture({
      table: {
        x: 1120,
        y: 700,
        width: 80,
        height: 60,
      },
    });

    const resized = resizeTableLayout(floorPlan, 'table-1', 220, 140);

    expect(resized.tableLayouts[0]).toMatchObject({
      x: 980,
      y: 620,
      width: 220,
      height: 140,
    });
  });

  it('changes table shape and regenerates seat layouts from chair count', () => {
    const floorPlan = floorPlanFixture();

    const changed = changeTableShape(floorPlan, 'table-1', RestaurantTableShape.Round, 4);

    expect(changed.tableLayouts[0]).toMatchObject({
      shape: RestaurantTableShape.Round,
      width: 96,
      height: 96,
    });
    expect(changed.tableLayouts[0].seatLayouts).toEqual(buildSeatLayouts(RestaurantTableShape.Round, 4));
  });

  it('adds a visual layout for a setup area that is not on the floor plan yet', () => {
    const floorPlan = floorPlanFixture();

    const changed = addAreaLayoutFromSetup(floorPlan, {
      id: 'area-2',
      branchId: 'branch-1',
      floorId: 'floor-1',
      name: 'Terraza',
      type: 1,
      sortOrder: 2,
      isActive: true,
    });

    expect(changed.areaLayouts).toHaveLength(2);
    expect(changed.areaLayouts[1]).toMatchObject({
      areaId: 'area-2',
      areaName: 'Terraza',
      x: 80,
      y: 80,
      width: 520,
      height: 320,
      rotationDegrees: 0,
      zIndex: 2,
    });
  });

  it('does not add duplicate visual layouts for a setup area already on the floor plan', () => {
    const floorPlan = floorPlanFixture();

    const changed = addAreaLayoutFromSetup(floorPlan, {
      id: 'area-1',
      branchId: 'branch-1',
      floorId: 'floor-1',
      name: 'Salon',
      type: 0,
      sortOrder: 1,
      isActive: true,
    });

    expect(changed).toEqual(floorPlan);
  });

  it('adds a visual layout for a setup table that is not on the floor plan yet', () => {
    const floorPlan = floorPlanFixture();

    const changed = addTableLayoutFromSetup(floorPlan, {
      id: 'table-2',
      companyId: 'company-1',
      branchId: 'branch-1',
      floorId: 'floor-1',
      areaId: 'area-1',
      label: 'A2',
      minCapacity: 2,
      maxCapacity: 4,
      defaultReservationMinutes: 90,
      shape: RestaurantTableShape.Round,
      isActive: true,
    });

    expect(changed.tableLayouts).toHaveLength(2);
    expect(changed.tableLayouts[1]).toMatchObject({
      tableId: 'table-2',
      tableLabel: 'A2',
      areaId: 'area-1',
      x: 210,
      y: 190,
      width: 96,
      height: 96,
      rotationDegrees: 0,
      shape: RestaurantTableShape.Round,
      zIndex: 5,
    });
    expect(changed.tableLayouts[1].seatLayouts).toEqual(buildSeatLayouts(RestaurantTableShape.Round, 4));
  });

  it('generates bar seat layouts in a single service row', () => {
    expect(buildSeatLayouts(RestaurantTableShape.Bar, 3)).toEqual([
      { seatNumber: 1, x: 20, y: 92, rotationDegrees: 180 },
      { seatNumber: 2, x: 50, y: 92, rotationDegrees: 180 },
      { seatNumber: 3, x: 80, y: 92, rotationDegrees: 180 },
    ]);
  });

  it('tracks dirty editor changes and restores clean state after undoing all edits', () => {
    const state = createFloorPlanEditorState(floorPlanFixture());
    const changed = applyEditorChange(state, (draft) => resizeTableLayout(draft, 'table-1', 180, 120));
    const restored = undoEditorChange(changed);

    expect(restored.floorPlan.tableLayouts[0]).toMatchObject({
      width: 100,
      height: 80,
    });
    expect(restored.isDirty).toBe(false);
    expect(restored.future).toHaveLength(1);
  });

  it('shapes a full floor plan save payload from the editable detail', () => {
    const floorPlan = floorPlanFixture();

    const input = toSaveFloorPlanInput(floorPlan);

    expect(input).toEqual({
      name: 'Cena principal',
      canvasWidth: 1200,
      canvasHeight: 760,
      gridSize: 20,
      isActive: true,
      areaLayouts: [
        {
          areaId: 'area-1',
          x: 20,
          y: 20,
          width: 520,
          height: 320,
          rotationDegrees: 0,
          zIndex: 1,
        },
      ],
      tableLayouts: [
        {
          tableId: 'table-1',
          x: 150,
          y: 150,
          width: 100,
          height: 80,
          rotationDegrees: 0,
          shape: RestaurantTableShape.Rectangle,
          zIndex: 4,
          seatLayouts: [{ seatNumber: 1, x: 10, y: 12, rotationDegrees: 0 }],
        },
      ],
    });
  });
});

function floorPlanFixture({
  table,
}: {
  table?: Partial<RestaurantFloorPlanDetail['tableLayouts'][number]>;
} = {}): RestaurantFloorPlanDetail {
  return {
    id: 'floor-plan-1',
    branchId: 'branch-1',
    floorId: 'floor-1',
    name: 'Cena principal',
    canvasWidth: 1200,
    canvasHeight: 760,
    gridSize: 20,
    isActive: true,
    areaLayouts: [
      {
        areaId: 'area-1',
        areaName: 'Salon',
        x: 20,
        y: 20,
        width: 520,
        height: 320,
        rotationDegrees: 0,
        zIndex: 1,
      },
    ],
    tableLayouts: [
      {
        tableId: 'table-1',
        tableLabel: 'M12',
        areaId: 'area-1',
        x: 150,
        y: 150,
        width: 100,
        height: 80,
        rotationDegrees: 0,
        shape: RestaurantTableShape.Rectangle,
        zIndex: 4,
        seatLayouts: [{ seatNumber: 1, x: 10, y: 12, rotationDegrees: 0 }],
        ...table,
      },
    ],
  };
}
