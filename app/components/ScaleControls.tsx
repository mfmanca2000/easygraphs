'use client';

import { Slider } from './ui/slider';

export interface ScaleControlsProps {
  scale: { x: number; y: number };
  onScaleChange: (scale: { x: number; y: number }) => void;
}

export default function ScaleControls({ scale, onScaleChange }: ScaleControlsProps) {
  return (
    <div className="space-y-4">
      {/* X Scale */}
      <div>
        <div className="field-label">
          <span>X axis</span>
          <span className="field-value">{Math.round(scale.x)} px/unit</span>
        </div>
        <div className="flex items-center gap-3">
          <Slider
            min={10}
            max={100}
            step={1}
            value={[scale.x]}
            onValueChange={(value) => onScaleChange({ ...scale, x: value[0] })}
            className="flex-1"
          />
          <input
            type="number"
            min="10"
            max="100"
            value={Math.round(scale.x)}
            onChange={(e) => onScaleChange({ ...scale, x: Number(e.target.value) })}
            className="input input-mono"
            style={{ width: 64 }}
            aria-label="X scale"
          />
        </div>
      </div>

      {/* Y Scale */}
      <div>
        <div className="field-label">
          <span>Y axis</span>
          <span className="field-value">{Math.round(scale.y)} px/unit</span>
        </div>
        <div className="flex items-center gap-3">
          <Slider
            min={10}
            max={100}
            step={1}
            value={[scale.y]}
            onValueChange={(value) => onScaleChange({ ...scale, y: value[0] })}
            className="flex-1"
          />
          <input
            type="number"
            min="10"
            max="100"
            value={Math.round(scale.y)}
            onChange={(e) => onScaleChange({ ...scale, y: Number(e.target.value) })}
            className="input input-mono"
            style={{ width: 64 }}
            aria-label="Y scale"
          />
        </div>
      </div>
    </div>
  );
}
