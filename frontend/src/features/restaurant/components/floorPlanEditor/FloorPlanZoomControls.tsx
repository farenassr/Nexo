import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import labels from '../../labels.es.json';

export function FloorPlanZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}) {
  return (
    <div className="editor-zoom-controls" aria-label={labels.editor.zoom}>
      <button type="button" className="icon-button" onClick={onZoomOut} aria-label={labels.editor.zoomOut}>
        <ZoomOut size={16} />
      </button>
      <span>{Math.round(zoom * 100)}%</span>
      <button type="button" className="icon-button" onClick={onZoomIn} aria-label={labels.editor.zoomIn}>
        <ZoomIn size={16} />
      </button>
      <button type="button" className="icon-button" onClick={onResetZoom} aria-label={labels.editor.resetZoom}>
        <RotateCcw size={16} />
      </button>
    </div>
  );
}
