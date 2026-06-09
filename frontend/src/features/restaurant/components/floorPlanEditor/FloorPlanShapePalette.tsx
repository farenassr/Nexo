import { Circle, RectangleHorizontal, Square, SquareRoundCorner } from 'lucide-react';
import labels from '../../labels.es.json';
import { RestaurantTableShape } from '../../types';

const shapeOptions = [
  { shape: RestaurantTableShape.Round, label: labels.shapes.round, icon: Circle },
  { shape: RestaurantTableShape.Square, label: labels.shapes.square, icon: Square },
  { shape: RestaurantTableShape.Rectangle, label: labels.shapes.rectangle, icon: RectangleHorizontal },
  { shape: RestaurantTableShape.Booth, label: labels.shapes.booth, icon: SquareRoundCorner },
  { shape: RestaurantTableShape.Bar, label: labels.shapes.bar, icon: RectangleHorizontal },
] as const;

export function FloorPlanShapePalette({
  selectedShape,
  disabled,
  onSelectShape,
}: {
  selectedShape: RestaurantTableShape | null;
  disabled: boolean;
  onSelectShape: (shape: RestaurantTableShape) => void;
}) {
  return (
    <div className="shape-palette" aria-label={labels.editor.shapePalette}>
      {shapeOptions.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.shape}
            type="button"
            className="table-option shape-option"
            aria-pressed={selectedShape === option.shape}
            disabled={disabled}
            onClick={() => onSelectShape(option.shape)}
          >
            <Icon size={18} />
            <strong>{option.label}</strong>
          </button>
        );
      })}
    </div>
  );
}
