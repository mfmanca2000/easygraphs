'use client';

import { Trash2 } from 'lucide-react';
import type { FillArea } from '@/app/utils/canvas/fillArea';
import { Slider } from './ui/slider';

export interface FillAreaEditorProps {
  fillAreas: FillArea[];
  onColorChange: (index: number, color: string) => void;
  onOpacityChange: (index: number, opacity: number) => void;
  onDelete: (index: number) => void;
  onEditBoundary?: (fillAreaId: string) => void;
}

const PRESET_FILL_COLORS = [
  '#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA',
  '#FFD8B3', '#E0BBE4', '#FFDFD3', '#C7CEEA'
];

export default function FillAreaEditor({
  fillAreas,
  onColorChange,
  onOpacityChange,
  onDelete,
  onEditBoundary
}: FillAreaEditorProps) {

  if (fillAreas.length === 0) {
    return (
      <div className="empty">
        No fill areas yet. Choose the Fill tool and click boundary points on the canvas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fillAreas.map((fillArea, index) => (
        <div key={fillArea.id} className="card space-y-3">
          {/* Fill Area Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="shrink-0"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  backgroundColor: fillArea.color,
                  opacity: fillArea.opacity,
                  border: '1px solid var(--border-strong)'
                }}
              />
              <div className="min-w-0">
                <div style={{ fontSize: 13, fontWeight: 500 }}>Fill #{index + 1}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {fillArea.boundaryPoints.length} boundary points
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onEditBoundary && (
                <button onClick={() => onEditBoundary(fillArea.id)} className="btn btn-sm">
                  Edit boundary
                </button>
              )}
              <button
                onClick={() => onDelete(index)}
                className="btn btn-ghost btn-icon btn-sm btn-danger"
                aria-label="Delete fill area"
                title="Delete fill area"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <div className="field-label">Color</div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={fillArea.color}
                onChange={(e) => onColorChange(index, e.target.value)}
                className="color-input"
                aria-label="Fill color"
              />
              <span className="field-value">{fillArea.color.toUpperCase()}</span>
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {PRESET_FILL_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => onColorChange(index, color)}
                  className="swatch"
                  style={{ backgroundColor: color }}
                  aria-pressed={color === fillArea.color}
                  title={color}
                  aria-label={color}
                />
              ))}
            </div>
          </div>

          {/* Opacity Slider */}
          <div>
            <div className="field-label">
              <span>Opacity</span>
              <span className="field-value">{Math.round(fillArea.opacity * 100)}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[fillArea.opacity * 100]}
              onValueChange={(value) => onOpacityChange(index, value[0] / 100)}
              className="w-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
