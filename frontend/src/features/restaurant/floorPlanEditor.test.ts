import { describe, expect, it } from 'vitest';
import { RestaurantTableShape, type RestaurantFloorPlanDetail } from './types';
import { moveTableLayout, toSaveFloorPlanInput } from './floorPlanEditor';

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

function floorPlanFixture(): RestaurantFloorPlanDetail {
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
      },
    ],
  };
}
