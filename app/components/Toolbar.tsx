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
  lineStyle: 'solid' | 'dashed' | 'dotted';
  onLineStyleChange: (style: 'solid' | 'dashed' | 'dotted') => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  arrowType: 'none' | 'end' | 'start' | 'both';
  onArrowTypeChange: (type: 'none' | 'end' | 'start' | 'both') => void;
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

export default function Toolbar({
  showGrid,
  onToggleGrid,
  showAxisUnits,
  onToggleAxisUnits,
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
  curveType,
  onCurveTypeChange,
  drawMode,
  onDrawModeChange
}: ToolbarProps) {

  return (
    <div className="space-y-5">        

        {/* Draw Mode */}
        <div>
          <label className="text-sm font-medium block mb-3" style={{ color: 'var(--pencil-lead)' }}>
            Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['select', 'point', 'line', 'bezier', 'freehand', 'function', 'textbox'] as DrawMode[]).map((mode) => (
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
                 mode === 'bezier' ? '∿ Curve' :
                 mode === 'freehand' ? '✎ Freehand' :
                 mode === 'function' ? 'ƒ(x) Function' :
                 mode === 'textbox' ? '□ Text Box' :
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

        {/* Line Style */}
        <div>
          <label className="text-sm font-medium block mb-3" style={{ color: 'var(--pencil-lead)' }}>
            Line Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['solid', 'dashed', 'dotted'] as const).map((style) => (
              <button
                key={style}
                onClick={() => onLineStyleChange(style)}
                className="px-3 py-2.5 rounded-md text-sm font-medium transition-all capitalize"
                style={{
                  background: lineStyle === style ? 'var(--architect-blue)' : 'transparent',
                  color: lineStyle === style ? 'white' : 'var(--pencil-lead)',
                  border: `1.5px solid ${lineStyle === style ? 'var(--architect-blue)' : 'var(--canvas-border)'}`,
                }}
              >
                <span className="text-base mr-1">
                  {style === 'solid' && '━'}
                  {style === 'dashed' && '┅'}
                  {style === 'dotted' && '┈'}
                </span>
                <span className="text-xs">{style}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Arrow Type */}
        <div>
          <label className="text-sm font-medium block mb-3" style={{ color: 'var(--pencil-lead)' }}>
            Arrow Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['none', 'end', 'start', 'both'] as const).map((type) => (
              <button
                key={type}
                onClick={() => onArrowTypeChange(type)}
                className="px-3 py-2.5 rounded-md text-sm font-medium transition-all"
                style={{
                  background: arrowType === type ? 'var(--architect-blue)' : 'transparent',
                  color: arrowType === type ? 'white' : 'var(--pencil-lead)',
                  border: `1.5px solid ${arrowType === type ? 'var(--architect-blue)' : 'var(--canvas-border)'}`,
                }}
              >
                <span className="text-base mr-1">
                  {type === 'none' && '─'}
                  {type === 'end' && '─→'}
                  {type === 'start' && '←─'}
                  {type === 'both' && '←→'}
                </span>
                <span className="text-xs capitalize">{type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Curve Type - only show when bezier mode is selected */}
        {drawMode === 'bezier' && (
          <div>
            <label className="text-sm font-medium block mb-3" style={{ color: 'var(--pencil-lead)' }}>
              Curve Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['quadratic', 'cubic', 's-curve'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => onCurveTypeChange(type)}
                  className="px-3 py-2.5 rounded-md text-sm font-medium transition-all capitalize"
                  style={{
                    background: curveType === type ? 'var(--architect-blue)' : 'transparent',
                    color: curveType === type ? 'white' : 'var(--pencil-lead)',
                    border: `1.5px solid ${curveType === type ? 'var(--architect-blue)' : 'var(--canvas-border)'}`,
                  }}
                >
                  {type === 'quadratic' ? 'Quad' : type === 'cubic' ? 'Cubic' : 'S-Curve'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Opacity */}
        <div>
          <label className="text-sm font-medium block mb-3" style={{ color: 'var(--pencil-lead)' }}>
            Opacity
            <span className="ml-2 font-mono" style={{ color: 'var(--architect-orange)' }}>
              {Math.round(opacity * 100)}%
            </span>
          </label>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[opacity * 100]}
            onValueChange={(value) => onOpacityChange(value[0] / 100)}
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

    </div>
  );
}
