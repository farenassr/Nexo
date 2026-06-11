import { Loader2 } from 'lucide-react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import labels from '../labels.es.json';
import {
  RestaurantTableShape,
  RestaurantTableVisualStatus,
  type RestaurantFloorPlanDetail,
  type RestaurantTableLayoutDetail,
  type RestaurantTableStatusDetail,
} from '../types';
import { TableQuickTooltip } from './live/TableQuickTooltip';
import { visualStatusLabel, visualStatusToken } from './restaurantUi';

export function StatusLegend() {
  const items = [
    [RestaurantTableVisualStatus.Available, labels.status.available],
    [RestaurantTableVisualStatus.Reserved, labels.status.reserved],
    [RestaurantTableVisualStatus.Occupied, labels.status.occupied],
    [RestaurantTableVisualStatus.Blocked, labels.status.blocked],
    [RestaurantTableVisualStatus.Cleaning, labels.status.cleaning],
    [RestaurantTableVisualStatus.Inactive, labels.status.inactive],
  ] as const;

  return (
    <div className="status-legend" aria-label={labels.sections.floor}>
      {items.map(([status, label]) => (
        <span key={status} data-status={visualStatusToken(status)}>
          <i />
          {label}
        </span>
      ))}
    </div>
  );
}

export function FloorPlanCanvas({
  canvasRef,
  floorPlan,
  tables,
  statuses,
  selectedTableId,
  isEditingLayout,
  isFetchingStatus,
  showQuickTooltip = false,
  onSelectTable,
  onBeginAreaDrag,
  onBeginDrag,
  onMoveDrag,
  onEndDrag,
}: {
  canvasRef: RefObject<HTMLDivElement | null>;
  floorPlan: RestaurantFloorPlanDetail;
  tables: RestaurantTableLayoutDetail[];
  statuses: Map<string, RestaurantTableStatusDetail>;
  selectedTableId: string | null;
  isEditingLayout: boolean;
  isFetchingStatus: boolean;
  showQuickTooltip?: boolean;
  onSelectTable: (tableId: string) => void;
  onBeginAreaDrag?: (event: ReactPointerEvent<HTMLDivElement>, areaId: string) => void;
  onBeginDrag: (event: ReactPointerEvent<HTMLButtonElement>, tableId: string) => void;
  onMoveDrag: (event: ReactPointerEvent<HTMLButtonElement | HTMLDivElement>) => void;
  onEndDrag: (event: ReactPointerEvent<HTMLButtonElement | HTMLDivElement>) => void;
}) {
  return (
    <div className="floor-wrap">
      {isFetchingStatus && (
        <span className="floor-refresh">
          <Loader2 size={14} className="spin" /> {labels.states.syncing}
        </span>
      )}
      <div ref={canvasRef} className="floor-canvas premium-canvas" style={{ aspectRatio: `${floorPlan.canvasWidth} / ${floorPlan.canvasHeight}` }}>
        {floorPlan.areaLayouts.map((area) => (
          <div
            key={area.areaId}
            className="floor-area"
            data-editing={isEditingLayout}
            style={layoutStyle(area, floorPlan.canvasWidth, floorPlan.canvasHeight)}
            onPointerDown={(event) => onBeginAreaDrag?.(event, area.areaId)}
            onPointerMove={onMoveDrag}
            onPointerUp={onEndDrag}
            onPointerCancel={onEndDrag}
          >
            {area.areaName}
          </div>
        ))}
        {tables.map((table) => {
          const tableStatus = statuses.get(table.tableId);
          const visualStatus = tableStatus?.status ?? RestaurantTableVisualStatus.Available;
          return (
            <button
              key={table.tableId}
              type="button"
              className="floor-table"
              data-status={visualStatusToken(visualStatus)}
              data-shape={shapeToken(table.shape)}
              data-selected={selectedTableId === table.tableId}
              data-editing={isEditingLayout}
              style={layoutStyle(table, floorPlan.canvasWidth, floorPlan.canvasHeight)}
              title={tableStatus?.reason ?? table.tableLabel}
              onClick={() => onSelectTable(table.tableId)}
              onPointerDown={(event) => onBeginDrag(event, table.tableId)}
              onPointerMove={onMoveDrag}
              onPointerUp={onEndDrag}
              onPointerCancel={onEndDrag}
            >
              <TableChairs table={table} />
              <strong>{table.tableLabel}</strong>
              <small>{visualStatusLabel(visualStatus)}</small>
              {showQuickTooltip && <TableQuickTooltip table={table} status={tableStatus ?? null} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TableChairs({ table }: { table: RestaurantTableLayoutDetail }) {
  const seats = table.seatLayouts.length > 0 ? table.seatLayouts : defaultSeatLayouts(table.shape);
  return (
    <span className="chair-layer" aria-hidden="true">
      {seats.slice(0, 10).map((seat) => (
        <i
          key={seat.seatNumber}
          style={{
            left: `${seat.x}%`,
            top: `${seat.y}%`,
            transform: `translate(-50%, -50%) rotate(${seat.rotationDegrees}deg)`,
          }}
        />
      ))}
    </span>
  );
}

function layoutStyle(
  item: { x: number; y: number; width: number; height: number; rotationDegrees: number; zIndex?: number },
  canvasWidth: number,
  canvasHeight: number,
): CSSProperties {
  return {
    left: `${(item.x / canvasWidth) * 100}%`,
    top: `${(item.y / canvasHeight) * 100}%`,
    width: `${(item.width / canvasWidth) * 100}%`,
    height: `${(item.height / canvasHeight) * 100}%`,
    transform: `rotate(${item.rotationDegrees}deg)`,
    zIndex: item.zIndex,
  };
}

function shapeToken(shape: RestaurantTableShape) {
  switch (shape) {
    case RestaurantTableShape.Round:
      return 'round';
    case RestaurantTableShape.Square:
      return 'square';
    case RestaurantTableShape.Rectangle:
      return 'rectangle';
    case RestaurantTableShape.Booth:
      return 'booth';
    case RestaurantTableShape.Bar:
      return 'bar';
    case RestaurantTableShape.Custom:
      return 'custom';
  }
}

function defaultSeatLayouts(shape: RestaurantTableShape) {
  if (shape === RestaurantTableShape.Round) {
    return [
      { seatNumber: 1, x: 50, y: -8, rotationDegrees: 0 },
      { seatNumber: 2, x: 96, y: 44, rotationDegrees: 90 },
      { seatNumber: 3, x: 50, y: 92, rotationDegrees: 180 },
      { seatNumber: 4, x: -8, y: 44, rotationDegrees: 270 },
    ];
  }

  return [
    { seatNumber: 1, x: 18, y: -10, rotationDegrees: 0 },
    { seatNumber: 2, x: 50, y: -10, rotationDegrees: 0 },
    { seatNumber: 3, x: 82, y: -10, rotationDegrees: 0 },
    { seatNumber: 4, x: 18, y: 110, rotationDegrees: 180 },
    { seatNumber: 5, x: 50, y: 110, rotationDegrees: 180 },
    { seatNumber: 6, x: 82, y: 110, rotationDegrees: 180 },
  ];
}
