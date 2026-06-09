import { Trash2 } from 'lucide-react';
import { Field } from '../restaurantUi';
import labels from '../../labels.es.json';
import { RestaurantTableShape, type RestaurantAreaLayoutDetail, type RestaurantTableLayoutDetail } from '../../types';

export function FloorPlanPropertiesPanel({
  table,
  areas,
  onWidthChange,
  onHeightChange,
  onRotationChange,
  onChairCountChange,
}: {
  table: RestaurantTableLayoutDetail | null;
  areas: RestaurantAreaLayoutDetail[];
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onRotationChange: (rotationDegrees: number) => void;
  onChairCountChange: (chairCount: number) => void;
}) {
  if (!table) {
    return <p className="muted-copy">{labels.states.noTableSelected}</p>;
  }

  const areaName = areas.find((area) => area.areaId === table.areaId)?.areaName ?? labels.states.unassigned;
  const chairCount = table.seatLayouts.length;

  return (
    <div className="editor-properties">
      <Field label={labels.editor.tableLabel}>
        <input value={table.tableLabel} disabled aria-readonly="true" />
      </Field>
      <div className="layout-fields">
        <Field label={labels.fields.width}>
          <input type="number" min={44} value={table.width} onChange={(event) => callWithNumber(event.currentTarget.valueAsNumber, onWidthChange)} />
        </Field>
        <Field label={labels.fields.height}>
          <input type="number" min={44} value={table.height} onChange={(event) => callWithNumber(event.currentTarget.valueAsNumber, onHeightChange)} />
        </Field>
        <Field label={labels.fields.rotation}>
          <input
            type="number"
            min={0}
            max={359}
            value={table.rotationDegrees}
            onChange={(event) => callWithNumber(event.currentTarget.valueAsNumber, onRotationChange)}
          />
        </Field>
        <Field label={labels.editor.chairCount}>
          <input
            type="number"
            min={0}
            max={16}
            value={chairCount}
            onChange={(event) => callWithNumber(event.currentTarget.valueAsNumber, onChairCountChange)}
          />
        </Field>
      </div>
      <div className="layout-fields">
        <Field label={labels.editor.minCapacity}>
          <input value={chairCount > 0 ? 1 : 0} disabled aria-readonly="true" />
        </Field>
        <Field label={labels.editor.preferredCapacity}>
          <input value={chairCount} disabled aria-readonly="true" />
        </Field>
        <Field label={labels.editor.maxCapacity}>
          <input value={chairCount} disabled aria-readonly="true" />
        </Field>
        <Field label={labels.setup.areaFilter}>
          <input value={areaName} disabled aria-readonly="true" />
        </Field>
      </div>
      <Field label={labels.fields.shape}>
        <input value={shapeLabel(table.shape)} disabled aria-readonly="true" />
      </Field>
      <label className="editor-check-row">
        <input type="checkbox" checked disabled readOnly />
        <span>{labels.editor.activeManagedBySetup}</span>
      </label>
      <button type="button" className="danger-button" disabled title={labels.editor.deactivateUnavailable}>
        <Trash2 size={16} />
        {labels.editor.deactivateTable}
      </button>
    </div>
  );
}

function shapeLabel(shape: RestaurantTableShape) {
  switch (shape) {
    case RestaurantTableShape.Round:
      return labels.shapes.round;
    case RestaurantTableShape.Square:
      return labels.shapes.square;
    case RestaurantTableShape.Rectangle:
      return labels.shapes.rectangle;
    case RestaurantTableShape.Booth:
      return labels.shapes.booth;
    case RestaurantTableShape.Bar:
      return labels.shapes.bar;
    case RestaurantTableShape.Custom:
      return 'Custom';
  }
}

function callWithNumber(value: number, callback: (value: number) => void) {
  if (Number.isFinite(value)) {
    callback(value);
  }
}
