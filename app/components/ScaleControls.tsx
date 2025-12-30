'use client';

import { Slider } from './ui/slider';

export interface ScaleControlsProps {
  scale: { x: number; y: number };
  onScaleChange: (scale: { x: number; y: number }) => void;
  onResetPan?: () => void;
}

export default function ScaleControls({ scale, onScaleChange, onResetPan }: ScaleControlsProps) {
  return (
    <div className="space-y-4">
        {/* X Scale */}
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
            X-axis
            <span className="ml-2 font-mono" style={{ color: 'var(--architect-orange)' }}>
              {scale.x}px/unit
            </span>
          </label>
          <Slider
            min={10}
            max={100}
            step={1}
            value={[scale.x]}
            onValueChange={(value) => onScaleChange({ ...scale, x: value[0] })}
            className="w-full"
          />
          <div className="flex justify-between text-xs mt-1" style={{
            color: 'var(--pencil-lead)',
            opacity: 0.6,
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            <span>10</span>
            <span>100</span>
          </div>
        </div>

        {/* Y Scale */}
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
            Y-axis
            <span className="ml-2 font-mono" style={{ color: 'var(--architect-orange)' }}>
              {scale.y}px/unit
            </span>
          </label>
          <Slider
            min={10}
            max={100}
            step={1}
            value={[scale.y]}
            onValueChange={(value) => onScaleChange({ ...scale, y: value[0] })}
            className="w-full"
          />
          <div className="flex justify-between text-xs mt-1" style={{
            color: 'var(--pencil-lead)',
            opacity: 0.6,
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            <span>10</span>
            <span>100</span>
          </div>
        </div>

        {/* Numeric inputs */}
        <div className="pt-3 border-t" style={{ borderColor: 'var(--graph-lines)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{
                color: 'var(--pencil-lead)',
                opacity: 0.7
              }}>
                X Scale
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={scale.x}
                onChange={(e) => onScaleChange({ ...scale, x: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-md"
                style={{
                  border: '1.5px solid var(--canvas-border)',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--pencil-lead)'
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{
                color: 'var(--pencil-lead)',
                opacity: 0.7
              }}>
                Y Scale
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={scale.y}
                onChange={(e) => onScaleChange({ ...scale, y: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-md"
                style={{
                  border: '1.5px solid var(--canvas-border)',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--pencil-lead)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Reset button */}
        <button
          onClick={() => {
            onScaleChange({ x: 40, y: 40 });
            onResetPan?.();
          }}
          className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all"
          style={{
            background: 'transparent',
            color: 'var(--architect-blue)',
            border: '1.5px solid var(--canvas-border)'
          }}
        >
          Reset to Default
        </button>
    </div>
  );
}
