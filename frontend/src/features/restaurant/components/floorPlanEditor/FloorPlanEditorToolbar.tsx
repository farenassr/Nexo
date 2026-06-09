import { BoxSelect, Loader2, MousePointer2, Move, Plus, Redo2, Save, Shapes, Undo2 } from 'lucide-react';
import labels from '../../labels.es.json';
import { FloorPlanZoomControls } from './FloorPlanZoomControls';

export type FloorPlanEditorTool = 'select' | 'move' | 'add-table' | 'add-area';

const editorTools = [
  { key: 'select', label: labels.editor.select, icon: MousePointer2 },
  { key: 'move', label: labels.editor.move, icon: Move },
  { key: 'add-table', label: labels.editor.addTable, icon: Plus },
  { key: 'add-area', label: labels.editor.addArea, icon: BoxSelect },
] as const;

export function FloorPlanEditorToolbar({
  activeTool,
  canUndo,
  canRedo,
  canSave,
  isSaving,
  zoom,
  onToolChange,
  onSave,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: {
  activeTool: FloorPlanEditorTool;
  canUndo: boolean;
  canRedo: boolean;
  canSave: boolean;
  isSaving: boolean;
  zoom: number;
  onToolChange: (tool: FloorPlanEditorTool) => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}) {
  return (
    <div className="editor-toolbar" aria-label={labels.sections.floorEditor}>
      <div className="editor-tool-group">
        {editorTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.key}
              type="button"
              className="secondary-button editor-tool-button"
              data-active={activeTool === tool.key}
              onClick={() => onToolChange(tool.key)}
              title={tool.label}
            >
              <Icon size={16} />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>
      <div className="editor-tool-group">
        <button type="button" className="icon-button" onClick={onUndo} disabled={!canUndo} aria-label={labels.editor.undo}>
          <Undo2 size={16} />
        </button>
        <button type="button" className="icon-button" onClick={onRedo} disabled={!canRedo} aria-label={labels.editor.redo}>
          <Redo2 size={16} />
        </button>
        <FloorPlanZoomControls zoom={zoom} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onResetZoom={onResetZoom} />
        <button type="button" className="primary-button compact-button" onClick={onSave} disabled={!canSave || isSaving}>
          {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
          {labels.actions.saveLayout}
        </button>
        <span className="editor-mode-pill">
          <Shapes size={15} />
          {labels.editor.designMode}
        </span>
      </div>
    </div>
  );
}
