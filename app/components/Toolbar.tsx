'use client';

import { DrawMode } from './GraphCanvas';
import { Slider } from './ui/slider';

export interface ToolbarProps {
  showGrid: boolean;
  onToggleGrid: () => void;
  showAxisUnits: boolean;
  onToggleAxisUnits: () => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  onClear: () => void;
  onUndo: () => void;
  onExport: () => void;
  onExportJSON: () => void;
  onImportJSON: () => void;
}

const PRESET_COLORS = [
  '#000000', '#E74C3C', '#27AE60', '#2B5F82',
  '#E67E22', '#9B59B6', '#1ABC9C', '#F39C12',
  '#34495E', '#16A085', '#95A5A6', '#E91E63'
];

export default function Toolbar({
  showGrid,
  onToggleGrid,
  showAxisUnits,
  onToggleAxisUnits,
  strokeColor,
  onStrokeColorChange,
  strokeWidth,
  onStrokeWidthChange,
  drawMode,
  onDrawModeChange,
  onClear,
  onUndo,
  onExport,
  onExportJSON,
  onImportJSON
}: ToolbarProps) {
  return (
    <div className="control-panel rounded-lg p-5">
      <div className="space-y-5">
        {/* Header */}
        <h3 className="text-sm font-semibold" style={{
          color: 'var(--architect-blue)',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          Drawing Tools
        </h3>

        {/* Grid Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: 'var(--pencil-lead)' }}>
            Grid
          </label>
          <button
            onClick={onToggleGrid}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: showGrid ? 'var(--architect-blue)' : 'var(--graph-lines)',
              color: showGrid ? 'white' : 'var(--pencil-lead)',
              border: showGrid ? 'none' : '1px solid var(--canvas-border)'
            }}
          >
            {showGrid ? 'Visible' : 'Hidden'}
          </button>
        </div>

        {/* Axis Units Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: 'var(--pencil-lead)' }}>
            Axis Units
          </label>
          <button
            onClick={onToggleAxisUnits}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: showAxisUnits ? 'var(--architect-blue)' : 'var(--graph-lines)',
              color: showAxisUnits ? 'white' : 'var(--pencil-lead)',
              border: showAxisUnits ? 'none' : '1px solid var(--canvas-border)'
            }}
          >
            {showAxisUnits ? 'Visible' : 'Hidden'}
          </button>
        </div>

        {/* Draw Mode */}
        <div>
          <label className="text-sm font-medium block mb-3" style={{ color: 'var(--pencil-lead)' }}>
            Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['select', 'point', 'line', 'bezier', 'freehand', 'function'] as DrawMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onDrawModeChange(mode)}
                className="px-3 py-2.5 rounded-md text-sm font-medium transition-all capitalize"
                style={{
                  background: drawMode === mode ? 'var(--architect-blue)' : 'transparent',
                  color: drawMode === mode ? 'white' : 'var(--pencil-lead)',
                  border: `1.5px solid ${drawMode === mode ? 'var(--architect-blue)' : 'var(--canvas-border)'}`,
                }}
              >
                {mode === 'select' ? '↖ Select' :
                 mode === 'point' ? '• Point' :
                 mode === 'line' ? '─ Line' :
                 mode === 'bezier' ? '∿ Bezier' :
                 mode === 'freehand' ? '✎ Freehand' :
                 mode === 'function' ? 'ƒ(x) Function' :
                 mode}
              </button>
            ))}
          </div>
        </div>

        {/* Color Picker */}
        <div>
          <label className="text-sm font-medium block mb-3" style={{ color: 'var(--pencil-lead)' }}>
            Color
          </label>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => onStrokeColorChange(e.target.value)}
              className="w-12 h-12 rounded-md cursor-pointer"
              style={{ border: '2px solid var(--canvas-border)' }}
            />
            <span className="text-sm font-mono" style={{ color: 'var(--pencil-lead)' }}>
              {strokeColor.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => onStrokeColorChange(color)}
                className="w-full aspect-square rounded-md transition-all hover:scale-110"
                style={{
                  backgroundColor: color,
                  border: `2px solid ${color === strokeColor ? 'var(--architect-orange)' : 'var(--canvas-border)'}`,
                  boxShadow: color === strokeColor ? '0 2px 8px rgba(230, 126, 34, 0.3)' : 'none'
                }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Stroke Width */}
        <div>
          <label className="text-sm font-medium block mb-3" style={{ color: 'var(--pencil-lead)' }}>
            Stroke Width
            <span className="ml-2 font-mono" style={{ color: 'var(--architect-orange)' }}>
              {strokeWidth}px
            </span>
          </label>
          <Slider
            min={1}
            max={20}
            step={1}
            value={[strokeWidth]}
            onValueChange={(value) => onStrokeWidthChange(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs mt-1" style={{
            color: 'var(--pencil-lead)',
            opacity: 0.6,
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            <span>1</span>
            <span>20</span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--graph-lines)' }}>
          <button
            onClick={onExport}
            className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: 'var(--architect-green)',
              color: 'white',
              border: 'none'
            }}
          >
            ↓ Export PNG
          </button>
          <button
            onClick={onExportJSON}
            className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: 'var(--architect-blue)',
              color: 'white',
              border: 'none'
            }}
          >
            ↓ Export JSON
          </button>
          <button
            onClick={onImportJSON}
            className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: 'transparent',
              color: 'var(--architect-blue)',
              border: '1.5px solid var(--architect-blue)'
            }}
          >
            ↑ Import JSON
          </button>
          <button
            onClick={onUndo}
            className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: 'transparent',
              color: 'var(--architect-blue)',
              border: '1.5px solid var(--canvas-border)'
            }}
          >
            ↺ Undo
          </button>
          <button
            onClick={onClear}
            className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: 'rgba(231, 76, 60, 0.1)',
              color: 'var(--architect-red)',
              border: '1.5px solid var(--architect-red)'
            }}
          >
            ✕ Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
