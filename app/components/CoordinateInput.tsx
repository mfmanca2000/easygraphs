'use client';

import { useState } from 'react';
import { Point, GraphElement } from './GraphCanvas';

export interface CoordinateInputProps {
  onAddLine: (start: Point, end: Point) => void;
  currentPoint?: Point;
  selectedElement?: GraphElement | null;
  selectedElementId?: number | null;
}

export default function CoordinateInput({ onAddLine, currentPoint, selectedElement, selectedElementId }: CoordinateInputProps) {
  const [startX, setStartX] = useState('');
  const [startY, setStartY] = useState('');
  const [endX, setEndX] = useState('');
  const [endY, setEndY] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const start = {
      x: parseFloat(startX),
      y: parseFloat(startY)
    };

    const end = {
      x: parseFloat(endX),
      y: parseFloat(endY)
    };

    if (!isNaN(start.x) && !isNaN(start.y) && !isNaN(end.x) && !isNaN(end.y)) {
      onAddLine(start, end);
      setStartX('');
      setStartY('');
      setEndX('');
      setEndY('');
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
        Coordinates
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Start Point */}
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
            Start Point
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.1"
              value={startX}
              onChange={(e) => setStartX(e.target.value)}
              placeholder="X"
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{
                border: '1.5px solid var(--canvas-border)',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--pencil-lead)'
              }}
            />
            <input
              type="number"
              step="0.1"
              value={startY}
              onChange={(e) => setStartY(e.target.value)}
              placeholder="Y"
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{
                border: '1.5px solid var(--canvas-border)',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--pencil-lead)'
              }}
            />
          </div>
        </div>

        {/* End Point */}
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
            End Point
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.1"
              value={endX}
              onChange={(e) => setEndX(e.target.value)}
              placeholder="X"
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{
                border: '1.5px solid var(--canvas-border)',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--pencil-lead)'
              }}
            />
            <input
              type="number"
              step="0.1"
              value={endY}
              onChange={(e) => setEndY(e.target.value)}
              placeholder="Y"
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{
                border: '1.5px solid var(--canvas-border)',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--pencil-lead)'
              }}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all"
          style={{
            background: 'var(--architect-blue)',
            color: 'white',
            border: 'none'
          }}
        >
          + Add Line
        </button>
      </form>

      {/* Selected Element Display */}
      {selectedElement && selectedElementId !== null && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--graph-lines)' }}>
          <p className="text-xs font-medium mb-2" style={{
            color: 'var(--pencil-lead)',
            opacity: 0.7,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Selected Element #{selectedElementId}
          </p>
          <div className="space-y-2">
            {selectedElement.type === 'line' && (
              <>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>Start Point</p>
                  <div className="px-3 py-2 rounded-md" style={{
                    background: 'rgba(230, 126, 34, 0.1)',
                    border: '1px solid var(--architect-orange)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.875rem',
                    color: 'var(--architect-orange)',
                    fontWeight: 600
                  }}>
                    ({selectedElement.points[0].x.toFixed(2)}, {selectedElement.points[0].y.toFixed(2)})
                  </div>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>End Point</p>
                  <div className="px-3 py-2 rounded-md" style={{
                    background: 'rgba(230, 126, 34, 0.1)',
                    border: '1px solid var(--architect-orange)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.875rem',
                    color: 'var(--architect-orange)',
                    fontWeight: 600
                  }}>
                    ({selectedElement.points[1].x.toFixed(2)}, {selectedElement.points[1].y.toFixed(2)})
                  </div>
                </div>
              </>
            )}
            {selectedElement.type === 'bezier' && (
              <>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>Start Point</p>
                  <div className="px-3 py-2 rounded-md" style={{
                    background: 'rgba(230, 126, 34, 0.1)',
                    border: '1px solid var(--architect-orange)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.875rem',
                    color: 'var(--architect-orange)',
                    fontWeight: 600
                  }}>
                    ({selectedElement.points[0].x.toFixed(2)}, {selectedElement.points[0].y.toFixed(2)})
                  </div>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>End Point</p>
                  <div className="px-3 py-2 rounded-md" style={{
                    background: 'rgba(230, 126, 34, 0.1)',
                    border: '1px solid var(--architect-orange)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.875rem',
                    color: 'var(--architect-orange)',
                    fontWeight: 600
                  }}>
                    ({selectedElement.points[1].x.toFixed(2)}, {selectedElement.points[1].y.toFixed(2)})
                  </div>
                </div>
                {selectedElement.controlPoint && (
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>Control Point</p>
                    <div className="px-3 py-2 rounded-md" style={{
                      background: 'rgba(155, 89, 182, 0.1)',
                      border: '1px solid #9B59B6',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.875rem',
                      color: '#9B59B6',
                      fontWeight: 600
                    }}>
                      ({selectedElement.controlPoint.x.toFixed(2)}, {selectedElement.controlPoint.y.toFixed(2)})
                    </div>
                  </div>
                )}
              </>
            )}
            {selectedElement.type === 'freehand' && (
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>
                  Freehand Path ({selectedElement.points.length} points)
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedElement.points.slice(0, 5).map((point, idx) => (
                    <div key={idx} className="px-2 py-1 rounded-md text-xs" style={{
                      background: 'rgba(230, 126, 34, 0.05)',
                      border: '1px solid var(--graph-lines)',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'var(--architect-orange)',
                      fontWeight: 600
                    }}>
                      P{idx}: ({point.x.toFixed(2)}, {point.y.toFixed(2)})
                    </div>
                  ))}
                  {selectedElement.points.length > 5 && (
                    <p className="text-xs text-center" style={{ color: 'var(--pencil-lead)', opacity: 0.5, fontStyle: 'italic' }}>
                      +{selectedElement.points.length - 5} more points
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Point Display */}
      {!selectedElement && currentPoint && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--graph-lines)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--pencil-lead)', opacity: 0.7 }}>
            Last Clicked:
          </p>
          <div className="px-3 py-2 rounded-md" style={{
            background: 'rgba(43, 95, 130, 0.05)',
            border: '1px solid var(--graph-lines)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.875rem',
            color: 'var(--architect-blue)',
            fontWeight: 600
          }}>
            ({currentPoint.x.toFixed(2)}, {currentPoint.y.toFixed(2)})
          </div>
        </div>
      )}
    </div>
  );
}
