'use client';

import { useState } from 'react';
import { Point, GraphElement, DrawMode } from './GraphCanvas';

export interface CoordinateInputProps {
  onAddLine: (start: Point, end: Point) => void;
  onAddPoint?: (point: Point) => void;
  currentPoint?: Point;
  selectedElement?: GraphElement | null;
  selectedElementId?: number | null;
  selectedElements?: Array<{ id: number; element: GraphElement }>;
  onTogglePointProjection?: (elementId: number) => void;
  showIntersections?: boolean;
  onToggleIntersections?: () => void;
  drawMode?: DrawMode;
  elementCount?: number;
}

export default function CoordinateInput({ onAddLine, onAddPoint, currentPoint, selectedElement, selectedElementId, selectedElements, onTogglePointProjection, showIntersections, onToggleIntersections, drawMode = 'line', elementCount = 0 }: CoordinateInputProps) {
  const [startX, setStartX] = useState('');
  const [startY, setStartY] = useState('');
  const [endX, setEndX] = useState('');
  const [endY, setEndY] = useState('');
  const [pointX, setPointX] = useState('');
  const [pointY, setPointY] = useState('');

  const handleLineSubmit = (e: React.FormEvent) => {
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

  const handlePointSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const point = {
      x: parseFloat(pointX),
      y: parseFloat(pointY)
    };

    if (!isNaN(point.x) && !isNaN(point.y) && onAddPoint) {
      onAddPoint(point);
      setPointX('');
      setPointY('');
    }
  };

  return (
    <div>
      {/* Line Tool Form */}
      {drawMode === 'line' && (
        <form onSubmit={handleLineSubmit} className="space-y-4">
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
      )}

      {/* Point Tool Form */}
      {drawMode === 'point' && (
        <form onSubmit={handlePointSubmit} className="space-y-4">
          {/* Point */}
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
              Point
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.1"
                value={pointX}
                onChange={(e) => setPointX(e.target.value)}
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
                value={pointY}
                onChange={(e) => setPointY(e.target.value)}
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
            + Add Point
          </button>
        </form>
      )}

      {/* Intersection toggle button - only show when more than 1 element */}
      {onToggleIntersections && elementCount > 1 && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--graph-lines)' }}>
          <button
            onClick={onToggleIntersections}
            className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: showIntersections ? '#9B59B6' : 'transparent',
              color: showIntersections ? 'white' : '#9B59B6',
              border: '1.5px solid #9B59B6'
            }}
          >
            {showIntersections ? '✓ Hide' : '+ Show'} Intersections
          </button>
        </div>
      )}

      {/* Selected Elements Display */}
      {selectedElements && selectedElements.length > 0 ? (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--graph-lines)' }}>
          <p className="text-xs font-medium mb-3" style={{
            color: 'var(--pencil-lead)',
            opacity: 0.7,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Selected Elements ({selectedElements.length})
          </p>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {selectedElements.map(({ id, element }) => (
              <div key={id} className="p-3 rounded-md" style={{
                background: 'rgba(43, 95, 130, 0.05)',
                border: '1px solid var(--graph-lines)'
              }}>
                <p className="text-xs font-semibold mb-2" style={{
                  color: 'var(--architect-blue)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Element #{id} ({element.type})
                </p>
                <div className="space-y-2">
                  {element.type === 'line' && (
                    <>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>Start</p>
                        <div className="px-2 py-1 rounded text-xs" style={{
                          background: 'rgba(230, 126, 34, 0.1)',
                          border: '1px solid var(--architect-orange)',
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--architect-orange)',
                          fontWeight: 600
                        }}>
                          ({element.points[0].x.toFixed(2)}, {element.points[0].y.toFixed(2)})
                        </div>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>End</p>
                        <div className="px-2 py-1 rounded text-xs" style={{
                          background: 'rgba(230, 126, 34, 0.1)',
                          border: '1px solid var(--architect-orange)',
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--architect-orange)',
                          fontWeight: 600
                        }}>
                          ({element.points[1].x.toFixed(2)}, {element.points[1].y.toFixed(2)})
                        </div>
                      </div>
                    </>
                  )}
                  {element.type === 'bezier' && (
                    <>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>Start</p>
                        <div className="px-2 py-1 rounded text-xs" style={{
                          background: 'rgba(230, 126, 34, 0.1)',
                          border: '1px solid var(--architect-orange)',
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--architect-orange)',
                          fontWeight: 600
                        }}>
                          ({element.points[0].x.toFixed(2)}, {element.points[0].y.toFixed(2)})
                        </div>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>End</p>
                        <div className="px-2 py-1 rounded text-xs" style={{
                          background: 'rgba(230, 126, 34, 0.1)',
                          border: '1px solid var(--architect-orange)',
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--architect-orange)',
                          fontWeight: 600
                        }}>
                          ({element.points[1].x.toFixed(2)}, {element.points[1].y.toFixed(2)})
                        </div>
                      </div>
                      {element.controlPoint && (
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>Control</p>
                          <div className="px-2 py-1 rounded text-xs" style={{
                            background: 'rgba(155, 89, 182, 0.1)',
                            border: '1px solid #9B59B6',
                            fontFamily: 'JetBrains Mono, monospace',
                            color: '#9B59B6',
                            fontWeight: 600
                          }}>
                            ({element.controlPoint.x.toFixed(2)}, {element.controlPoint.y.toFixed(2)})
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {element.type === 'point' && (
                    <>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>Location</p>
                        <div className="px-2 py-1 rounded text-xs" style={{
                          background: 'rgba(230, 126, 34, 0.1)',
                          border: '1px solid var(--architect-orange)',
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--architect-orange)',
                          fontWeight: 600
                        }}>
                          ({element.points[0].x.toFixed(2)}, {element.points[0].y.toFixed(2)})
                        </div>
                      </div>
                      {onTogglePointProjection && (
                        <button
                          onClick={() => onTogglePointProjection(id)}
                          className="w-full mt-2 px-3 py-1.5 rounded text-xs font-medium transition-all"
                          style={{
                            background: element.showProjection ? 'var(--architect-orange)' : 'transparent',
                            color: element.showProjection ? 'white' : 'var(--architect-orange)',
                            border: `1px solid var(--architect-orange)`
                          }}
                        >
                          {element.showProjection ? '✓ Hide' : '+ Show'} Projection
                        </button>
                      )}
                    </>
                  )}
                  {element.type === 'freehand' && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>
                        Path ({element.points.length} points)
                      </p>
                      <div className="text-xs px-2 py-1 rounded" style={{
                        background: 'rgba(230, 126, 34, 0.05)',
                        border: '1px solid var(--graph-lines)',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--architect-orange)'
                      }}>
                        Showing first 3 points
                      </div>
                      {element.points.slice(0, 3).map((point, idx) => (
                        <div key={idx} className="px-2 py-1 rounded text-xs mt-1" style={{
                          background: 'rgba(230, 126, 34, 0.05)',
                          border: '1px solid var(--graph-lines)',
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--architect-orange)',
                          fontWeight: 600
                        }}>
                          P{idx}: ({point.x.toFixed(2)}, {point.y.toFixed(2)})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : selectedElement && selectedElementId !== null && (
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
            {selectedElement.type === 'point' && (
              <div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--pencil-lead)', opacity: 0.6 }}>Point Location</p>
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
                {onTogglePointProjection && selectedElementId !== null && (
                  <button
                    onClick={() => onTogglePointProjection(selectedElementId!)}
                    className="w-full mt-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all"
                    style={{
                      background: selectedElement.showProjection ? 'var(--architect-orange)' : 'transparent',
                      color: selectedElement.showProjection ? 'white' : 'var(--architect-orange)',
                      border: `1.5px solid var(--architect-orange)`
                    }}
                  >
                    {selectedElement.showProjection ? '✓ Hide' : '+ Show'} Projection
                  </button>
                )}
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
