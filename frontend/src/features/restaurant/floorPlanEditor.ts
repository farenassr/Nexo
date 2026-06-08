import type { SaveRestaurantFloorPlanInput } from './api/restaurantApi';
import type { RestaurantFloorPlanDetail, RestaurantTableLayoutDetail } from './types';

export function moveTableLayout(
  floorPlan: RestaurantFloorPlanDetail,
  tableId: string,
  deltaX: number,
  deltaY: number,
): RestaurantFloorPlanDetail {
  return {
    ...floorPlan,
    tableLayouts: floorPlan.tableLayouts.map((table) =>
      table.tableId === tableId ? moveTableInsideCanvas(table, floorPlan.canvasWidth, floorPlan.canvasHeight, deltaX, deltaY) : table,
    ),
  };
}

export function replaceTableLayout(
  floorPlan: RestaurantFloorPlanDetail,
  tableLayout: RestaurantTableLayoutDetail,
): RestaurantFloorPlanDetail {
  return {
    ...floorPlan,
    tableLayouts: floorPlan.tableLayouts.map((table) => (table.tableId === tableLayout.tableId ? tableLayout : table)),
  };
}

export function toSaveFloorPlanInput(floorPlan: RestaurantFloorPlanDetail): SaveRestaurantFloorPlanInput {
  return {
    name: floorPlan.name,
    canvasWidth: floorPlan.canvasWidth,
    canvasHeight: floorPlan.canvasHeight,
    gridSize: floorPlan.gridSize,
    isActive: floorPlan.isActive,
    areaLayouts: floorPlan.areaLayouts.map((area) => ({
      areaId: area.areaId,
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      rotationDegrees: area.rotationDegrees,
      zIndex: area.zIndex,
    })),
    tableLayouts: floorPlan.tableLayouts.map((table) => ({
      tableId: table.tableId,
      x: table.x,
      y: table.y,
      width: table.width,
      height: table.height,
      rotationDegrees: table.rotationDegrees,
      shape: table.shape,
      zIndex: table.zIndex,
      seatLayouts: table.seatLayouts.map((seat) => ({
        seatNumber: seat.seatNumber,
        x: seat.x,
        y: seat.y,
        rotationDegrees: seat.rotationDegrees,
      })),
    })),
  };
}

function moveTableInsideCanvas(
  table: RestaurantTableLayoutDetail,
  canvasWidth: number,
  canvasHeight: number,
  deltaX: number,
  deltaY: number,
): RestaurantTableLayoutDetail {
  return {
    ...table,
    x: clamp(table.x + deltaX, 0, canvasWidth - table.width),
    y: clamp(table.y + deltaY, 0, canvasHeight - table.height),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
