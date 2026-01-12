'use client';

import type { FillArea } from '@/app/utils/canvas/fillArea';
import { Slider } from './ui/slider';

export interface FillAreaEditorProps {
  fillAreas: FillArea[];
  onColorChange: (index: number, color: string) => void;
  onOpacityChange: (index: number, opacity: number) => void;
  onDelete: (index: number) => void;
}

const PRESET_FILL_COLORS = [
  '#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA',
  '#FFD8B3', '#E0BBE4', '#FFDFD3', '#C7CEEA'
];

export default function FillAreaEditor({
  fillAreas,
  onColorChange,
  onOpacityChange,
  onDelete
}: FillAreaEditorProps) {

  if (fillAreas.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>
            No fill areas created yet
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--pencil-lead)', opacity: 0.6, fontStyle: 'italic' }}>
            Use Fill mode (■) to create areas by clicking boundary points
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium mb-3" style={{ color: 'var(--pencil-lead)' }}>
        Fill Areas
        <span className="ml-2 font-mono" style={{
          color: 'var(--architect-orange)',
          fontSize: '0.75rem'
        }}>
          ({fillAreas.length} total)
        </span>
      </div>

      {fillAreas.map((fillArea, index) => (
        <div
          key={fillArea.id}
          className="p-4 rounded-lg space-y-3"
          style={{
            border: '1.5px solid var(--canvas-border)',
            background: 'white'
          }}
        >
          {/* Fill Area Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-md"
                style={{
                  backgroundColor: fillArea.color,
                  opacity: fillArea.opacity,
                  border: '1px solid var(--canvas-border)'
                }}
              />
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--pencil-lead)' }}>
                  Fill #{index + 1}
                </div>
                <div className="text-xs" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>
                  {fillArea.boundaryPoints.length} boundary points
                </div>
              </div>
            </div>
            <button
              onClick={() => onDelete(index)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:bg-red-50"
              style={{
                color: '#E74C3C',
                border: '1px solid #E74C3C'
              }}
            >
              Delete
            </button>
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
              Color
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={fillArea.color}
                onChange={(e) => onColorChange(index, e.target.value)}
                className="w-10 h-10 rounded-md cursor-pointer"
                style={{ border: '2px solid var(--canvas-border)' }}
              />
              <span className="text-xs font-mono" style={{ color: 'var(--pencil-lead)' }}>
                {fillArea.color.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_FILL_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => onColorChange(index, color)}
                  className="w-full aspect-square rounded-md transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    border: `2px solid ${color === fillArea.color ? 'var(--architect-orange)' : 'var(--canvas-border)'}`,
                    boxShadow: color === fillArea.color ? '0 2px 8px rgba(230, 126, 34, 0.3)' : 'none'
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Opacity Slider */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
              Opacity
              <span className="ml-2 font-mono" style={{ color: 'var(--architect-orange)' }}>
                {Math.round(fillArea.opacity * 100)}%
              </span>
            </label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[fillArea.opacity * 100]}
              onValueChange={(value) => onOpacityChange(index, value[0] / 100)}
              className="w-full"
            />
            <div className="flex justify-between text-xs mt-1" style={{
              color: 'var(--pencil-lead)',
              opacity: 0.6,
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
