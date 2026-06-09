import type { SaveRestaurantFloorPlanInput } from './api/restaurantApi';
import { RestaurantTableShape, type RestaurantFloorPlanDetail, type RestaurantTableLayoutDetail } from './types';

const minimumTableSize = 44;

export interface FloorPlanEditorState {
  floorPlan: RestaurantFloorPlanDetail;
  initialFloorPlan: RestaurantFloorPlanDetail;
  past: RestaurantFloorPlanDetail[];
  future: RestaurantFloorPlanDetail[];
  isDirty: boolean;
}

export function createFloorPlanEditorState(floorPlan: RestaurantFloorPlanDetail): FloorPlanEditorState {
  const initialFloorPlan = cloneFloorPlan(floorPlan);
  return {
    floorPlan: cloneFloorPlan(floorPlan),
    initialFloorPlan,
    past: [],
    future: [],
    isDirty: false,
  };
}

export function applyEditorChange(
  state: FloorPlanEditorState,
  change: (floorPlan: RestaurantFloorPlanDetail) => RestaurantFloorPlanDetail,
): FloorPlanEditorState {
  const nextFloorPlan = change(cloneFloorPlan(state.floorPlan));

  if (floorPlansEqual(state.floorPlan, nextFloorPlan)) {
    return state;
  }

  return {
    ...state,
    floorPlan: nextFloorPlan,
    past: [...state.past, cloneFloorPlan(state.floorPlan)],
    future: [],
    isDirty: !floorPlansEqual(state.initialFloorPlan, nextFloorPlan),
  };
}

export function undoEditorChange(state: FloorPlanEditorState): FloorPlanEditorState {
  const previousFloorPlan = state.past[state.past.length - 1];
  if (!previousFloorPlan) {
    return state;
  }

  const nextPast = state.past.slice(0, -1);
  return {
    ...state,
    floorPlan: cloneFloorPlan(previousFloorPlan),
    past: nextPast,
    future: [cloneFloorPlan(state.floorPlan), ...state.future],
    isDirty: !floorPlansEqual(state.initialFloorPlan, previousFloorPlan),
  };
}

export function redoEditorChange(state: FloorPlanEditorState): FloorPlanEditorState {
  const nextFloorPlan = state.future[0];
  if (!nextFloorPlan) {
    return state;
  }

  return {
    ...state,
    floorPlan: cloneFloorPlan(nextFloorPlan),
    past: [...state.past, cloneFloorPlan(state.floorPlan)],
    future: state.future.slice(1),
    isDirty: !floorPlansEqual(state.initialFloorPlan, nextFloorPlan),
  };
}

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

export function resizeTableLayout(
  floorPlan: RestaurantFloorPlanDetail,
  tableId: string,
  width: number,
  height: number,
): RestaurantFloorPlanDetail {
  return {
    ...floorPlan,
    tableLayouts: floorPlan.tableLayouts.map((table) => {
      if (table.tableId !== tableId) {
        return table;
      }

      const nextWidth = clamp(width, minimumTableSize, floorPlan.canvasWidth);
      const nextHeight = clamp(height, minimumTableSize, floorPlan.canvasHeight);
      return {
        ...table,
        width: nextWidth,
        height: nextHeight,
        x: clamp(table.x, 0, floorPlan.canvasWidth - nextWidth),
        y: clamp(table.y, 0, floorPlan.canvasHeight - nextHeight),
      };
    }),
  };
}

export function changeTableShape(
  floorPlan: RestaurantFloorPlanDetail,
  tableId: string,
  shape: RestaurantTableShape,
  chairCount: number,
): RestaurantFloorPlanDetail {
  return replaceTableLayoutById(floorPlan, tableId, (table) => {
    const dimensions = defaultDimensionsForShape(shape, table.width, table.height);
    return {
      ...table,
      ...dimensions,
      shape,
      seatLayouts: buildSeatLayouts(shape, chairCount),
    };
  });
}

export function changeTableChairCount(
  floorPlan: RestaurantFloorPlanDetail,
  tableId: string,
  chairCount: number,
): RestaurantFloorPlanDetail {
  return replaceTableLayoutById(floorPlan, tableId, (table) => ({
    ...table,
    seatLayouts: buildSeatLayouts(table.shape, chairCount),
  }));
}

export function rotateTableLayout(
  floorPlan: RestaurantFloorPlanDetail,
  tableId: string,
  rotationDegrees: number,
): RestaurantFloorPlanDetail {
  return replaceTableLayoutById(floorPlan, tableId, (table) => ({
    ...table,
    rotationDegrees: normalizeRotation(rotationDegrees),
  }));
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

export function buildSeatLayouts(shape: RestaurantTableShape, chairCount: number) {
  const safeChairCount = Math.max(0, Math.min(Math.round(chairCount), 16));

  if (safeChairCount === 0) {
    return [];
  }

  if (shape === RestaurantTableShape.Bar) {
    return distributeAlongEdge(safeChairCount, 92, 180, 0, 20);
  }

  if (shape === RestaurantTableShape.Booth) {
    return distributeAlongEdge(safeChairCount, -8, 0);
  }

  if (shape === RestaurantTableShape.Round) {
    const radius = 52;
    return Array.from({ length: safeChairCount }, (_, index) => {
      const angle = (index / safeChairCount) * Math.PI * 2 - Math.PI / 2;
      return {
        seatNumber: index + 1,
        x: Math.round(50 + Math.cos(angle) * radius),
        y: Math.round(50 + Math.sin(angle) * radius),
        rotationDegrees: normalizeRotation((angle * 180) / Math.PI + 90),
      };
    });
  }

  const topCount = Math.ceil(safeChairCount / 2);
  const bottomCount = safeChairCount - topCount;
  return [
    ...distributeAlongEdge(topCount, -8, 0),
    ...distributeAlongEdge(bottomCount, 92, 180, topCount),
  ];
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

function replaceTableLayoutById(
  floorPlan: RestaurantFloorPlanDetail,
  tableId: string,
  mapTable: (table: RestaurantTableLayoutDetail) => RestaurantTableLayoutDetail,
) {
  return {
    ...floorPlan,
    tableLayouts: floorPlan.tableLayouts.map((table) => (table.tableId === tableId ? mapTable(table) : table)),
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

function defaultDimensionsForShape(shape: RestaurantTableShape, width: number, height: number) {
  switch (shape) {
    case RestaurantTableShape.Round:
      return { width: 96, height: 96 };
    case RestaurantTableShape.Square: {
      const size = Math.max(minimumTableSize, Math.round((width + height) / 2));
      return { width: size, height: size };
    }
    case RestaurantTableShape.Booth:
      return { width: Math.max(width, 120), height: Math.max(minimumTableSize, Math.round(height * 0.9)) };
    case RestaurantTableShape.Bar:
      return { width: Math.max(width, 140), height: Math.max(minimumTableSize, Math.round(height * 0.7)) };
    case RestaurantTableShape.Rectangle:
    case RestaurantTableShape.Custom:
      return { width, height };
  }
}

function distributeAlongEdge(chairCount: number, y: number, rotationDegrees: number, seatNumberOffset = 0, inset = 0) {
  if (chairCount <= 0) {
    return [];
  }

  return Array.from({ length: chairCount }, (_, index) => ({
    seatNumber: seatNumberOffset + index + 1,
    x:
      chairCount === 1
        ? 50
        : Math.round(inset + (index / (chairCount - 1)) * (100 - inset * 2)),
    y,
    rotationDegrees,
  }));
}

function normalizeRotation(rotationDegrees: number) {
  return ((Math.round(rotationDegrees) % 360) + 360) % 360;
}

function cloneFloorPlan(floorPlan: RestaurantFloorPlanDetail): RestaurantFloorPlanDetail {
  return {
    ...floorPlan,
    areaLayouts: floorPlan.areaLayouts.map((area) => ({ ...area })),
    tableLayouts: floorPlan.tableLayouts.map((table) => ({
      ...table,
      seatLayouts: table.seatLayouts.map((seat) => ({ ...seat })),
    })),
  };
}

function floorPlansEqual(left: RestaurantFloorPlanDetail, right: RestaurantFloorPlanDetail) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
