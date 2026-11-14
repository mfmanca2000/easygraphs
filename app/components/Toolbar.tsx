'use client';

import type { LucideIcon } from 'lucide-react';
import { MousePointer2, Dot, Slash, Spline, Pencil, SquareFunction, PaintBucket, Type } from 'lucide-react';
import type { DrawMode } from '@/app/types/canvas';
import { Slider } from './ui/slider';

export interface ToolbarProps {
  showGrid: boolean;
  onToggleGrid: () => void;
  showAxisUnits: boolean;
  onToggleAxisUnits: () => void;
  showOnlyPositive: boolean;
  onToggleOnlyPositive: () => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  onLineStyleChange: (style: 'solid' | 'dashed' | 'dotted') => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  arrowType: 'none' | 'end' | 'start' | 'both';
  onArrowTypeChange: (type: 'none' | 'end' | 'start' | 'both') => void;
  arrowSize: number;
  onArrowSizeChange: (size: number) => void;
  curveType: 'quadratic' | 'cubic' | 's-curve';
  onCurveTypeChange: (type: 'quadratic' | 'cubic' | 's-curve') => void;
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
}

const PRESET_COLORS = [
  '#000000', '#E74C3C', '#27AE60', '#2B5F82',
  '#E67E22', '#9B59B6', '#1ABC9C', '#F39C12',
  '#34495E', '#16A085', '#95A5A6', '#E91E63'
];

const TOOLS: { mode: DrawMode; icon: LucideIcon; label: string; title: string }[] = [
  { mode: 'select', icon: MousePointer2, label: 'Select', title: 'Select' },
  { mode: 'point', icon: Dot, label: 'Point', title: 'Point' },
  { mode: 'line', icon: Slash, label: 'Line', title: 'Line' },
  { mode: 'bezier', icon: Spline, label: 'Curve', title: 'Curve' },
  { mode: 'freehand', icon: Pencil, label: 'Freehand', title: 'Freehand' },
  { mode: 'function', icon: SquareFunction, label: 'Function', title: 'Function' },
  { mode: 'fill', icon: PaintBucket, label: 'Fill', title: 'Fill' },
  { mode: 'textbox', icon: Type, label: 'Text', title: 'Text box' },
];

const DASH: Record<'solid' | 'dashed' | 'dotted', string | undefined> = {
  solid: undefined,
  dashed: '4 3',
  dotted: '1 3',
};

function Section({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div
      className="space-y-4"
      style={first ? undefined : { borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}
    >
      {children}
    </div>
  );
}

function Switch({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 13 }}>{label}</span>
      <button role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={onClick} />
    </div>
  );
}

export default function Toolbar({
  showGrid,
  onToggleGrid,
  showAxisUnits,
  onToggleAxisUnits,
  showOnlyPositive,
  onToggleOnlyPositive,
  strokeColor,
  onStrokeColorChange,
  strokeWidth,
  onStrokeWidthChange,
  lineStyle,
  onLineStyleChange,
  opacity,
  onOpacityChange,
  arrowType,
  onArrowTypeChange,
  arrowSize,
  onArrowSizeChange,
  curveType,
  onCurveTypeChange,
  drawMode,
  onDrawModeChange
}: ToolbarProps) {
  return (
    <div>
      <Section first>
        <div className="grid grid-cols-4 gap-1">
          {TOOLS.map(({ mode, icon: Icon, label, title }) => (
            <button
              key={mode}
              className="tool"
              aria-pressed={drawMode === mode}
              title={title}
              onClick={() => onDrawModeChange(mode)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section>
        <div>
          <div className="field-label">Color</div>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => onStrokeColorChange(e.target.value)}
              className="color-input"
              aria-label="Stroke color"
            />
            <span className="field-value">{strokeColor.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => onStrokeColorChange(color)}
                className="swatch"
                style={{ backgroundColor: color }}
                aria-pressed={color === strokeColor}
                title={color}
                aria-label={color}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="field-label">
            <span>Stroke width</span>
            <span className="field-value">{strokeWidth}px</span>
          </div>
          <Slider
            min={1}
            max={20}
            step={1}
            value={[strokeWidth]}
            onValueChange={(value) => onStrokeWidthChange(value[0])}
            className="w-full"
          />
        </div>

        <div>
          <div className="field-label">Line style</div>
          <div className="seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {(['solid', 'dashed', 'dotted'] as const).map((style) => (
              <button
                key={style}
                className="seg-item"
                aria-pressed={lineStyle === style}
                onClick={() => onLineStyleChange(style)}
                title={style}
              >
                <svg width="24" height="4" aria-hidden="true">
                  <line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray={DASH[style]} />
                </svg>
                <span className="capitalize">{style}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="field-label">Arrows</div>
          <div className="seg" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {([['none', 'None'], ['end', 'End'], ['start', 'Start'], ['both', 'Both']] as const).map(([type, label]) => (
              <button
                key={type}
                className="seg-item"
                aria-pressed={arrowType === type}
                onClick={() => onArrowTypeChange(type)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {arrowType !== 'none' && (
          <div>
            <div className="field-label">
              <span>Arrow size</span>
              <span className="field-value">{arrowSize}px</span>
            </div>
            <Slider
              min={3}
              max={10}
              step={1}
              value={[arrowSize]}
              onValueChange={(value) => onArrowSizeChange(value[0])}
              className="w-full"
            />
          </div>
        )}

        {drawMode === 'bezier' && (
          <div>
            <div className="field-label">Curve type</div>
            <div className="seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {([['quadratic', 'Quad'], ['cubic', 'Cubic'], ['s-curve', 'S-Curve']] as const).map(([type, label]) => (
                <button
                  key={type}
                  className="seg-item"
                  aria-pressed={curveType === type}
                  onClick={() => onCurveTypeChange(type)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="field-label">
            <span>Opacity</span>
            <span className="field-value">{Math.round(opacity * 100)}%</span>
          </div>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[opacity * 100]}
            onValueChange={(value) => onOpacityChange(value[0] / 100)}
            className="w-full"
          />
        </div>
      </Section>

      <Section>
        <Switch label="Grid" checked={showGrid} onClick={onToggleGrid} />
        <Switch label="Axis units" checked={showAxisUnits} onClick={onToggleAxisUnits} />
        <Switch label="Positive quadrant only" checked={showOnlyPositive} onClick={onToggleOnlyPositive} />
      </Section>
    </div>
  );
}
