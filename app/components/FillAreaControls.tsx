'use client';

import { useState } from 'react';
import { GraphElement } from './GraphCanvas';

export interface FillAreaControlsProps {
  elementCount: number;
  elements: GraphElement[];
  onAddFill: (elementId: number, fillAbove: boolean, color: string, fillToAxis?: boolean) => void;
}

const PRESET_FILL_COLORS = [
  '#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA',
  '#FFD8B3', '#E0BBE4', '#FFDFD3', '#C7CEEA'
];

export default function FillAreaControls({ elementCount, elements, onAddFill }: FillAreaControlsProps) {
  const [selectedElement, setSelectedElement] = useState(0);
  const [fillAbove, setFillAbove] = useState(true);
  const [fillColor, setFillColor] = useState('#BAFFC9');
  const [fillToAxis, setFillToAxis] = useState(true);

  const handleAddFill = () => {
    if (selectedElement >= 0 && selectedElement < elementCount) {
      onAddFill(selectedElement, fillAbove, fillColor, fillToAxis);
    }
  };

  return (
    <div className="control-panel rounded-lg p-5">
      <h3 className="text-sm font-semibold mb-4" style={{
        color: 'var(--architect-blue)',
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.05em',
        textTransform: 'uppercase'
      }}>
        Fill Area
      </h3>

      <div className="space-y-4">
        {/* Element Selection */}
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
            Select Element
            <span className="ml-2 font-mono" style={{
              color: 'var(--architect-orange)',
              fontSize: '0.75rem'
            }}>
              ({elementCount} total)
            </span>
          </label>
          <select
            value={selectedElement}
            onChange={(e) => setSelectedElement(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm rounded-md"
            style={{
              border: '1.5px solid var(--canvas-border)',
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--pencil-lead)',
              background: 'white',
              cursor: elementCount === 0 ? 'not-allowed' : 'pointer'
            }}
            disabled={elementCount === 0}
          >
            {elementCount === 0 ? (
              <option value={0}>No elements</option>
            ) : (
              elements.map((element, index) => (
                <option key={index} value={index}>
                  #{index}: {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Fill Direction */}
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
            {fillToAxis ? 'Fill Region' : 'Direction'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFillAbove(true)}
              className="px-3 py-2.5 rounded-md text-sm font-medium transition-all"
              style={{
                background: fillAbove ? 'var(--architect-blue)' : 'transparent',
                color: fillAbove ? 'white' : 'var(--pencil-lead)',
                border: `1.5px solid ${fillAbove ? 'var(--architect-blue)' : 'var(--canvas-border)'}`,
              }}
            >
              {fillToAxis ? '↑ Negative Y' : '↑ Above'}
            </button>
            <button
              onClick={() => setFillAbove(false)}
              className="px-3 py-2.5 rounded-md text-sm font-medium transition-all"
              style={{
                background: !fillAbove ? 'var(--architect-blue)' : 'transparent',
                color: !fillAbove ? 'white' : 'var(--pencil-lead)',
                border: `1.5px solid ${!fillAbove ? 'var(--architect-blue)' : 'var(--canvas-border)'}`,
              }}
            >
              {fillToAxis ? '↓ Positive Y' : '↓ Below'}
            </button>
          </div>
          {fillToAxis && (
            <p className="text-xs mt-2" style={{ color: 'var(--pencil-lead)', opacity: 0.6, fontStyle: 'italic' }}>
              {fillAbove
                ? 'Fills from curve to x-axis (only where Y < 0)'
                : 'Fills from curve to x-axis (only where Y > 0)'}
            </p>
          )}
        </div>

        {/* Fill to Axis Toggle */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fillToAxis}
              onChange={(e) => setFillToAxis(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
              style={{ accentColor: 'var(--architect-blue)' }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--pencil-lead)' }}>
              Fill to X-Axis {fillToAxis ? '(y=0)' : '(canvas edge)'}
            </span>
          </label>
          <p className="text-xs mt-1 ml-6" style={{ color: 'var(--pencil-lead)', opacity: 0.6, fontStyle: 'italic' }}>
            {fillToAxis ? 'Fill area between curve and x-axis' : 'Fill area to canvas edge'}
          </p>
        </div>

        {/* Fill Color */}
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
            Fill Color
          </label>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="w-12 h-12 rounded-md cursor-pointer"
              style={{ border: '2px solid var(--canvas-border)' }}
            />
            <span className="text-sm font-mono" style={{ color: 'var(--pencil-lead)' }}>
              {fillColor.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_FILL_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setFillColor(color)}
                className="w-full aspect-square rounded-md transition-all hover:scale-110"
                style={{
                  backgroundColor: color,
                  border: `2px solid ${color === fillColor ? 'var(--architect-orange)' : 'var(--canvas-border)'}`,
                  boxShadow: color === fillColor ? '0 2px 8px rgba(230, 126, 34, 0.3)' : 'none'
                }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Add Fill Button */}
        <button
          onClick={handleAddFill}
          disabled={elementCount === 0}
          className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all"
          style={{
            background: elementCount === 0 ? 'var(--graph-lines)' : 'var(--architect-green)',
            color: elementCount === 0 ? 'var(--pencil-lead)' : 'white',
            border: 'none',
            cursor: elementCount === 0 ? 'not-allowed' : 'pointer',
            opacity: elementCount === 0 ? 0.5 : 1
          }}
        >
          + Add Fill
        </button>

        {elementCount === 0 && (
          <p className="text-xs text-center" style={{
            color: 'var(--pencil-lead)',
            opacity: 0.6,
            fontStyle: 'italic'
          }}>
            Draw elements first to add fills
          </p>
        )}
      </div>
    </div>
  );
}
