'use client';

import { useState } from 'react';
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
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onExportJPEG: (quality: number) => void;
  onExportPDF: (pageSize: string, orientation: 'portrait' | 'landscape') => void;
  onExportJSON: () => void;
  onImportJSON: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  hasSelection: boolean;
  onGroup: () => void;
  onUngroup: () => void;
  canGroup: boolean;
  canUngroup: boolean;
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
  onDrawModeChange,
  onClear,
  onUndo,
  onRedo,
  onExport,
  onExportJPEG,
  onExportPDF,
  onExportJSON,
  onImportJSON,
  onCopy,
  onPaste,
  onDelete,
  hasSelection,
  onGroup,
  onUngroup,
  canGroup,
  canUngroup
}: ToolbarProps) {
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'pdf'>('png');
  const [jpegQuality, setJpegQuality] = useState(90);
  const [pdfPageSize, setPdfPageSize] = useState<'letter' | 'a4' | 'a3'>('letter');
  const [pdfOrientation, setPdfOrientation] = useState<'landscape' | 'portrait'>('landscape');

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

        {/* Actions */}
        <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--graph-lines)' }}>
          {/* Format Selection */}
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--graph-lines)' }}>
              Export Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'png' | 'jpeg' | 'pdf')}
              className="w-full px-3 py-2 rounded-md text-sm"
              style={{
                background: 'var(--background)',
                color: 'var(--foreground)',
                border: '1px solid var(--graph-lines)'
              }}
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          {/* JPEG Quality Slider */}
          {exportFormat === 'jpeg' && (
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--graph-lines)' }}>
                Quality: {jpegQuality}%
              </label>
              <Slider
                value={[jpegQuality]}
                onValueChange={(value) => setJpegQuality(value[0])}
                min={80}
                max={100}
                step={5}
              />
            </div>
          )}

          {/* PDF Settings */}
          {exportFormat === 'pdf' && (
            <>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--graph-lines)' }}>
                  Page Size
                </label>
                <select
                  value={pdfPageSize}
                  onChange={(e) => setPdfPageSize(e.target.value as 'letter' | 'a4' | 'a3')}
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={{
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--graph-lines)'
                  }}
                >
                  <option value="letter">Letter (8.5×11&quot;)</option>
                  <option value="a4">A4 (210×297mm)</option>
                  <option value="a3">A3 (297×420mm)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--graph-lines)' }}>
                  Orientation
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPdfOrientation('landscape')}
                    className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all"
                    style={{
                      background: pdfOrientation === 'landscape' ? 'var(--architect-green)' : 'var(--background)',
                      color: pdfOrientation === 'landscape' ? 'white' : 'var(--foreground)',
                      border: `1px solid ${pdfOrientation === 'landscape' ? 'var(--architect-green)' : 'var(--graph-lines)'}`
                    }}
                  >
                    Landscape
                  </button>
                  <button
                    onClick={() => setPdfOrientation('portrait')}
                    className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all"
                    style={{
                      background: pdfOrientation === 'portrait' ? 'var(--architect-green)' : 'var(--background)',
                      color: pdfOrientation === 'portrait' ? 'white' : 'var(--foreground)',
                      border: `1px solid ${pdfOrientation === 'portrait' ? 'var(--architect-green)' : 'var(--graph-lines)'}`
                    }}
                  >
                    Portrait
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Export Button */}
          <button
            onClick={() => {
              if (exportFormat === 'png') onExport();
              else if (exportFormat === 'jpeg') onExportJPEG(jpegQuality / 100);
              else if (exportFormat === 'pdf') onExportPDF(pdfPageSize, pdfOrientation);
            }}
            className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: 'var(--architect-green)',
              color: 'white',
              border: 'none'
            }}
          >
            ↓ Export {exportFormat.toUpperCase()}
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
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onUndo}
              className="px-4 py-2.5 rounded-md text-sm font-medium transition-all"
              style={{
                background: 'transparent',
                color: 'var(--architect-blue)',
                border: '1.5px solid var(--canvas-border)'
              }}
            >
              ↺ Undo
            </button>
            <button
              onClick={onRedo}
              className="px-4 py-2.5 rounded-md text-sm font-medium transition-all"
              style={{
                background: 'transparent',
                color: 'var(--architect-blue)',
                border: '1.5px solid var(--canvas-border)'
              }}
            >
              ↻ Redo
            </button>
          </div>

          {/* Selection Actions */}
          <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--canvas-border)' }}>
            <h4 className="text-xs font-semibold" style={{ color: 'var(--architect-blue)' }}>
              Selection Actions
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={onCopy}
                disabled={!hasSelection}
                className="px-3 py-2 rounded-md text-sm font-medium transition-all"
                style={{
                  background: hasSelection ? 'var(--architect-blue)' : 'var(--graph-lines)',
                  color: hasSelection ? 'white' : 'var(--pencil-lead)',
                  opacity: hasSelection ? 1 : 0.5,
                  cursor: hasSelection ? 'pointer' : 'not-allowed',
                  border: '1.5px solid var(--canvas-border)'
                }}
                title="Copy (Ctrl+C)"
              >
                Copy
              </button>
              <button
                onClick={onPaste}
                className="px-3 py-2 rounded-md text-sm font-medium transition-all"
                style={{
                  background: 'var(--architect-blue)',
                  color: 'white',
                  border: '1.5px solid var(--canvas-border)'
                }}
                title="Paste (Ctrl+V)"
              >
                Paste
              </button>
              <button
                onClick={onDelete}
                disabled={!hasSelection}
                className="px-3 py-2 rounded-md text-sm font-medium transition-all"
                style={{
                  background: hasSelection ? 'var(--architect-red)' : 'var(--graph-lines)',
                  color: hasSelection ? 'white' : 'var(--pencil-lead)',
                  opacity: hasSelection ? 1 : 0.5,
                  cursor: hasSelection ? 'pointer' : 'not-allowed',
                  border: '1.5px solid var(--canvas-border)'
                }}
                title="Delete (Del/Backspace)"
              >
                Delete
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onGroup}
                disabled={!canGroup}
                className="px-3 py-2 rounded-md text-sm font-medium transition-all"
                style={{
                  background: canGroup ? 'var(--architect-blue)' : 'var(--graph-lines)',
                  color: canGroup ? 'white' : 'var(--pencil-lead)',
                  opacity: canGroup ? 1 : 0.5,
                  cursor: canGroup ? 'pointer' : 'not-allowed',
                  border: '1.5px solid var(--canvas-border)'
                }}
                title="Group selected elements"
              >
                Group
              </button>
              <button
                onClick={onUngroup}
                disabled={!canUngroup}
                className="px-3 py-2 rounded-md text-sm font-medium transition-all"
                style={{
                  background: canUngroup ? 'var(--architect-blue)' : 'var(--graph-lines)',
                  color: canUngroup ? 'white' : 'var(--pencil-lead)',
                  opacity: canUngroup ? 1 : 0.5,
                  cursor: canUngroup ? 'pointer' : 'not-allowed',
                  border: '1.5px solid var(--canvas-border)'
                }}
                title="Ungroup selected elements"
              >
                Ungroup
              </button>
            </div>
          </div>

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
