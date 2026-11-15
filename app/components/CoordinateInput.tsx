'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Point, GraphElement, DrawMode } from '@/app/types/canvas';

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

function CoordRow({ label, point, color }: { label: string; point: Point; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span className="coord" style={color ? { color } : undefined}>
        ({point.x.toFixed(2)}, {point.y.toFixed(2)})
      </span>
    </div>
  );
}

function ElementDetails({ id, element, onTogglePointProjection }: {
  id: number;
  element: GraphElement;
  onTogglePointProjection?: (id: number) => void;
}) {
  const title = element.type.charAt(0).toUpperCase() + element.type.slice(1);
  return (
    <div className="card space-y-2">
      <div style={{ fontSize: 13, fontWeight: 500 }}>
        {title} #{id}
      </div>
      {element.type === 'line' && (
        <>
          <CoordRow label="Start" point={element.points[0]} />
          <CoordRow label="End" point={element.points[1]} />
        </>
      )}
      {element.type === 'bezier' && (
        <>
          <CoordRow label="Start" point={element.points[0]} />
          <CoordRow label="End" point={element.points[1]} />
          {element.controlPoint && (
            <CoordRow label="Control" point={element.controlPoint} color="var(--intersect)" />
          )}
        </>
      )}
      {element.type === 'point' && (
        <>
          <CoordRow label="Location" point={element.points[0]} />
          {onTogglePointProjection && (
            <button
              onClick={() => onTogglePointProjection(id)}
              className="btn btn-sm btn-block"
              aria-pressed={!!element.showProjection}
            >
              {element.showProjection ? 'Hide projection' : 'Show projection'}
            </button>
          )}
        </>
      )}
      {element.type === 'freehand' && (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{element.points.length} points</div>
          {element.points.slice(0, 3).map((point, idx) => (
            <CoordRow key={idx} label={`P${idx}`} point={point} />
          ))}
        </>
      )}
    </div>
  );
}

function PointFields({ label, x, y, onX, onY }: {
  label: string;
  x: string;
  y: string;
  onX: (v: string) => void;
  onY: (v: string) => void;
}) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="0.1"
          value={x}
          onChange={(e) => onX(e.target.value)}
          placeholder="x"
          aria-label={`${label} x`}
          className="input input-mono"
        />
        <input
          type="number"
          step="0.1"
          value={y}
          onChange={(e) => onY(e.target.value)}
          placeholder="y"
          aria-label={`${label} y`}
          className="input input-mono"
        />
      </div>
    </div>
  );
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

  const hasMultiSelection = !!selectedElements && selectedElements.length > 0;
  const hasSingleSelection = !hasMultiSelection && !!selectedElement && selectedElementId !== null && selectedElementId !== undefined;
  const hasForm = drawMode === 'line' || drawMode === 'point';
  const showToggle = !!onToggleIntersections && elementCount > 1;

  return (
    <div className="space-y-4">
      {/* Line Tool Form */}
      {drawMode === 'line' && (
        <form onSubmit={handleLineSubmit} className="space-y-4">
          <PointFields label="Start" x={startX} y={startY} onX={setStartX} onY={setStartY} />
          <PointFields label="End" x={endX} y={endY} onX={setEndX} onY={setEndY} />
          <button type="submit" className="btn btn-primary btn-block">
            <Plus size={16} />
            Add line
          </button>
        </form>
      )}

      {/* Point Tool Form */}
      {drawMode === 'point' && (
        <form onSubmit={handlePointSubmit} className="space-y-4">
          <PointFields label="Point" x={pointX} y={pointY} onX={setPointX} onY={setPointY} />
          <button type="submit" className="btn btn-primary btn-block">
            <Plus size={16} />
            Add point
          </button>
        </form>
      )}

      {/* Intersection toggle button - only show when more than 1 element */}
      {showToggle && (
        <button
          onClick={onToggleIntersections}
          className="btn btn-block"
          aria-pressed={!!showIntersections}
          style={{
            background: showIntersections ? 'var(--intersect-soft)' : 'var(--surface)',
            borderColor: showIntersections ? 'var(--intersect)' : 'var(--border-strong)',
            color: showIntersections ? 'var(--intersect)' : 'var(--text)',
          }}
        >
          {showIntersections ? 'Hide intersections' : 'Show intersections'}
        </button>
      )}

      {/* Selected Elements Display */}
      {hasMultiSelection && (
        <div className="space-y-2">
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
            Selected ({selectedElements!.length})
          </div>
          {selectedElements!.map(({ id, element }) => (
            <ElementDetails key={id} id={id} element={element} onTogglePointProjection={onTogglePointProjection} />
          ))}
        </div>
      )}

      {hasSingleSelection && (
        <div className="space-y-2">
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Selected (1)</div>
          <ElementDetails
            id={selectedElementId!}
            element={selectedElement!}
            onTogglePointProjection={onTogglePointProjection}
          />
        </div>
      )}

      {!hasForm && !hasMultiSelection && !hasSingleSelection && !showToggle && (
        <div className="empty">Select an element to see its coordinates.</div>
      )}
    </div>
  );
}
