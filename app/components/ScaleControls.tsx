'use client';

import { Slider } from './ui/slider';
import { ZoomIn, ZoomOut } from 'lucide-react';

export interface ScaleControlsProps {
  scale: { x: number; y: number };
  onScaleChange: (scale: { x: number; y: number }) => void;
}

export default function ScaleControls({ scale, onScaleChange }: ScaleControlsProps) {
  const handleZoomIn = () => {
    const newScaleX = Math.min(100, scale.x * 1.1);
    const newScaleY = Math.min(100, scale.y * 1.1);
    onScaleChange({ x: newScaleX, y: newScaleY });
  };

  const handleZoomOut = () => {
    const newScaleX = Math.max(10, scale.x * 0.9);
    const newScaleY = Math.max(10, scale.y * 0.9);
    onScaleChange({ x: newScaleX, y: newScaleY });
  };

  return (
    <div className="space-y-4">
        {/* Zoom Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleZoomIn}
            className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2"
            style={{
              background: 'var(--architect-blue)',
              color: 'white',
              border: 'none'
            }}
            title="Zoom In"
          >
            <ZoomIn size={16} />
            Zoom In
          </button>
          <button
            onClick={handleZoomOut}
            className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2"
            style={{
              background: 'var(--architect-blue)',
              color: 'white',
              border: 'none'
            }}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
            Zoom Out
          </button>
        </div>
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
    </div>
  );
}
