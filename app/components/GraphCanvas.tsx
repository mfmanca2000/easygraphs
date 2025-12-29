'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { flushSync } from 'react-dom';
import { Parser } from 'expr-eval';

export type DrawMode = 'line' | 'bezier' | 'freehand' | 'fill' | 'select' | 'function' | 'point';

export type Action =
  | { type: 'element' }
  | { type: 'fill' }
  | { type: 'modify'; elementId: number; previousState: GraphElement };

export interface Point {
  x: number;
  y: number;
}

export interface GraphElement {
  type: 'line' | 'bezier' | 'freehand' | 'function' | 'point';
  points: Point[];
  color: string;
  lineWidth: number;
  controlPoint?: Point;
  formula?: string;  // For function type
  xMin?: number;     // For function type
  xMax?: number;     // For function type
  pointSize?: number;  // For point type
  showProjection?: boolean;  // For point type - whether to show projection lines
}

export interface FillArea {
  elementId: number;
  fillAbove: boolean;
  color: string;
  fillToAxis?: boolean; // If true, fill to axis instead of canvas edge
}

export interface GraphExportData {
  elements: GraphElement[];
  fillAreas: FillArea[];
  panOffset: Point;
}

export interface EasyGraphsExport {
  version: string;
  metadata: {
    exportDate: string;
    appVersion?: string;
  };
  canvas: {
    width: number;
    height: number;
  };
  view: {
    scale: { x: number; y: number };
    panOffset: { x: number; y: number };
    showGrid: boolean;
    showAxisUnits: boolean;
  };
  drawing: {
    elements: GraphElement[];
    fillAreas: FillArea[];
  };
  settings: {
    strokeColor: string;
    strokeWidth: number;
    drawMode: DrawMode;
  };
}

export interface GraphCanvasProps {
  width?: number;
  height?: number;
  showGrid: boolean;
  showAxisUnits?: boolean;
  strokeColor: string;
  strokeWidth: number;
  drawMode: DrawMode;
  scale: { x: number; y: number };
  onCoordinateClick?: (point: Point) => void;
  onSelectionChange?: (elementId: number | null) => void;
  onElementsChange?: (elementCount: number) => void;
  onScaleChange?: (scale: { x: number; y: number }) => void;
}

export interface GraphCanvasHandle {
  addLineByCoordinates: (start: Point, end: Point) => void;
  addFillArea: (elementId: number, fillAbove: boolean, color: string, fillToAxis?: boolean) => void;
  addFunction: (formula: string, xMin: number, xMax: number, color: string, lineWidth: number) => void;
  clearCanvas: () => void;
  undo: () => void;
  getElements: () => GraphElement[];
  exportToPNG: () => void;
  getSelectedElement: () => GraphElement | null;
  getSelectedElementId: () => number | null;
  updateSelectedElement: (color: string, lineWidth: number) => void;
  getExportData: () => GraphExportData;
  importData: (data: GraphExportData) => void;
}

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvasComponent(props, ref) {
  const {
    width = 800,
    height = 600,
    showGrid,
    showAxisUnits = true,
    strokeColor,
    strokeWidth,
    drawMode,
    scale,
    onCoordinateClick,
    onSelectionChange,
    onElementsChange,
    onScaleChange
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<GraphElement[]>([]);
  const [fillAreas, setFillAreas] = useState<FillArea[]>([]);
  const [actionHistory, setActionHistory] = useState<Action[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempControlPoint, setTempControlPoint] = useState<Point | null>(null);
  const [draggingControl, setDraggingControl] = useState(false);

  // Selection and editing state
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const [draggingControlPointFlag, setDraggingControlPointFlag] = useState(false);

  // Pan offset for mouse-centered zooming (in pixels)
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });

  // Ref to prevent duplicate undo operations
  const undoInProgressRef = useRef(false);

  // Convert canvas coordinates to graph coordinates
  const canvasToGraph = useCallback((canvasX: number, canvasY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const centerX = canvas.width / 2 + panOffset.x;
    const centerY = canvas.height / 2 + panOffset.y;

    return {
      x: ((canvasX - centerX) / scale.x),
      y: ((centerY - canvasY) / scale.y)
    };
  }, [scale, panOffset]);

  // Convert graph coordinates to canvas coordinates
  const graphToCanvas = useCallback((graphX: number, graphY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const centerX = canvas.width / 2 + panOffset.x;
    const centerY = canvas.height / 2 + panOffset.y;

    return {
      x: centerX + graphX * scale.x,
      y: centerY - graphY * scale.y
    };
  }, [scale, panOffset]);

  // Draw grid
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / 2 + panOffset.x;
    const centerY = canvas.height / 2 + panOffset.y;

    // Draw grid lines if enabled
    if (showGrid) {
      ctx.strokeStyle = '#D4E4EC';
      ctx.lineWidth = 1;

      // Draw vertical grid lines
      for (let i = -Math.floor(centerX / scale.x); i <= Math.floor(centerX / scale.x); i++) {
        const x = centerX + i * scale.x;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw horizontal grid lines
      for (let i = -Math.floor(centerY / scale.y); i <= Math.floor(centerY / scale.y); i++) {
        const y = centerY + i * scale.y;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Always draw axes (even if grid is hidden)
    ctx.strokeStyle = '#2B5F82';
    ctx.lineWidth = 2;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();

    // Draw axis units if enabled
    if (showAxisUnits) {
      ctx.fillStyle = '#2B5F82';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // X-axis units
      for (let i = -Math.floor(centerX / scale.x); i <= Math.floor(centerX / scale.x); i++) {
        if (i === 0) continue; // Skip origin
        const x = centerX + i * scale.x;
        if (x < 0 || x > canvas.width) continue;

        // Draw tick mark
        ctx.beginPath();
        ctx.moveTo(x, centerY - 5);
        ctx.lineTo(x, centerY + 5);
        ctx.stroke();

        // Draw label
        ctx.fillText(i.toString(), x, centerY + 8);
      }

      // Y-axis units
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = -Math.floor(centerY / scale.y); i <= Math.floor(centerY / scale.y); i++) {
        if (i === 0) continue; // Skip origin
        const y = centerY - i * scale.y;
        if (y < 0 || y > canvas.height) continue;

        // Draw tick mark
        ctx.beginPath();
        ctx.moveTo(centerX - 5, y);
        ctx.lineTo(centerX + 5, y);
        ctx.stroke();

        // Draw label
        ctx.fillText(i.toString(), centerX - 8, y);
      }

      // Draw origin label
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('0', centerX - 5, centerY + 5);
    }
  }, [showGrid, showAxisUnits, scale, panOffset]);

  // Draw a line element
  const drawLine = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    if (element.points.length < 2) return;

    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const start = graphToCanvas(element.points[0].x, element.points[0].y);
    const end = graphToCanvas(element.points[1].x, element.points[1].y);

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }, [graphToCanvas]);

  // Draw a bezier curve element
  const drawBezier = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    if (element.points.length < 2 || !element.controlPoint) return;

    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const start = graphToCanvas(element.points[0].x, element.points[0].y);
    const end = graphToCanvas(element.points[1].x, element.points[1].y);
    const control = graphToCanvas(element.controlPoint.x, element.controlPoint.y);

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
    ctx.stroke();
  }, [graphToCanvas]);

  // Draw a point element
  const drawPoint = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    if (element.points.length < 1) return;

    const point = element.points[0];
    const canvasPoint = graphToCanvas(point.x, point.y);
    const pointSize = element.pointSize || element.lineWidth * 2;

    // Draw the point
    ctx.fillStyle = element.color;
    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, pointSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw projection lines to axes if enabled
    if (element.showProjection) {
      ctx.strokeStyle = element.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]); // Dashed lines

      const origin = graphToCanvas(0, 0);
      const xAxis = graphToCanvas(point.x, 0);
      const yAxis = graphToCanvas(0, point.y);

      // Vertical line to x-axis
      ctx.beginPath();
      ctx.moveTo(canvasPoint.x, canvasPoint.y);
      ctx.lineTo(xAxis.x, xAxis.y);
      ctx.stroke();

      // Horizontal line to y-axis
      ctx.beginPath();
      ctx.moveTo(canvasPoint.x, canvasPoint.y);
      ctx.lineTo(yAxis.x, yAxis.y);
      ctx.stroke();

      // Draw small markers on axes
      ctx.setLineDash([]); // Solid lines
      ctx.fillStyle = element.color;

      // Marker on x-axis
      ctx.beginPath();
      ctx.arc(xAxis.x, xAxis.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Marker on y-axis
      ctx.beginPath();
      ctx.arc(yAxis.x, yAxis.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Reset line dash
      ctx.setLineDash([]);
    }
  }, [graphToCanvas]);

  // Simplify points using Ramer-Douglas-Peucker algorithm
  const simplifyPoints = useCallback((points: Point[], tolerance: number = 0.05): Point[] => {
    if (points.length < 3) return points;

    const getPerpendicularDistance = (point: Point, lineStart: Point, lineEnd: Point): number => {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;

      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag === 0) return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2));

      const u = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (mag * mag);

      const intersectX = lineStart.x + u * dx;
      const intersectY = lineStart.y + u * dy;

      return Math.sqrt(Math.pow(point.x - intersectX, 2) + Math.pow(point.y - intersectY, 2));
    };

    const rdp = (pts: Point[], epsilon: number): Point[] => {
      if (pts.length < 3) return pts;

      let dmax = 0;
      let index = 0;
      const end = pts.length - 1;

      for (let i = 1; i < end; i++) {
        const d = getPerpendicularDistance(pts[i], pts[0], pts[end]);
        if (d > dmax) {
          index = i;
          dmax = d;
        }
      }

      if (dmax > epsilon) {
        const recResults1 = rdp(pts.slice(0, index + 1), epsilon);
        const recResults2 = rdp(pts.slice(index), epsilon);
        return recResults1.slice(0, -1).concat(recResults2);
      } else {
        return [pts[0], pts[end]];
      }
    };

    return rdp(points, tolerance);
  }, []);

  // Draw a freehand curve with Catmull-Rom spline smoothing
  const drawFreehand = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    if (element.points.length < 2) return;

    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Simplify points to reduce noise
    const simplified = simplifyPoints(element.points, 0.05);
    const canvasPoints = simplified.map(p => graphToCanvas(p.x, p.y));

    if (canvasPoints.length < 2) {
      // Fallback for very short paths
      ctx.beginPath();
      ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
      if (canvasPoints.length === 2) {
        ctx.lineTo(canvasPoints[1].x, canvasPoints[1].y);
      }
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);

    if (canvasPoints.length === 2) {
      ctx.lineTo(canvasPoints[1].x, canvasPoints[1].y);
    } else {
      // Catmull-Rom spline for smooth curves
      const tension = 0.5; // 0.5 = Catmull-Rom, 0 = linear, 1 = tight curves

      for (let i = 0; i < canvasPoints.length - 1; i++) {
        const p0 = canvasPoints[i === 0 ? 0 : i - 1];
        const p1 = canvasPoints[i];
        const p2 = canvasPoints[i + 1];
        const p3 = canvasPoints[i + 2] || p2;

        // Draw cubic Bezier curve using Catmull-Rom control points
        const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
        const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
        const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
        const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
    }

    ctx.stroke();
  }, [graphToCanvas, simplifyPoints]);

  // Draw a function curve
  const drawFunction = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    if (element.points.length < 2) return;

    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const canvasPoints = element.points.map(p => graphToCanvas(p.x, p.y));

    ctx.beginPath();
    ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);

    // Draw smooth curve through all points
    for (let i = 1; i < canvasPoints.length - 1; i++) {
      const xc = (canvasPoints[i].x + canvasPoints[i + 1].x) / 2;
      const yc = (canvasPoints[i].y + canvasPoints[i + 1].y) / 2;
      ctx.quadraticCurveTo(canvasPoints[i].x, canvasPoints[i].y, xc, yc);
    }

    // Last point
    if (canvasPoints.length > 1) {
      const last = canvasPoints[canvasPoints.length - 1];
      const secondLast = canvasPoints[canvasPoints.length - 2];
      ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
    }

    ctx.stroke();
  }, [graphToCanvas]);

  // Fill area above or below a curve
  const fillAreaForElement = useCallback((ctx: CanvasRenderingContext2D, elementId: number, fillAbove: boolean, color: string, fillToAxis: boolean = false) => {
    const element = elements[elementId];
    if (!element) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerY = canvas.height / 2 + panOffset.y;

    // Save canvas state for clipping
    ctx.save();

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3;

    // If filling to axis, clip to only the relevant half
    if (fillToAxis) {
      ctx.beginPath();
      if (fillAbove) {
        // "Above" means fill between negative Y values and x-axis
        // Clip to bottom half of canvas (below x-axis)
        ctx.rect(0, centerY, canvas.width, canvas.height - centerY);
      } else {
        // "Below" means fill between positive Y values and x-axis
        // Clip to top half of canvas (above x-axis)
        ctx.rect(0, 0, canvas.width, centerY);
      }
      ctx.clip();
    }

    ctx.beginPath();

    if (element.type === 'line') {
      const start = graphToCanvas(element.points[0].x, element.points[0].y);
      const end = graphToCanvas(element.points[1].x, element.points[1].y);

      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);

      if (fillToAxis) {
        // Always fill to x-axis when fillToAxis is true
        ctx.lineTo(end.x, centerY);
        ctx.lineTo(start.x, centerY);
      } else {
        // Original behavior - fill to canvas edge
        if (fillAbove) {
          ctx.lineTo(end.x, 0);
          ctx.lineTo(start.x, 0);
        } else {
          ctx.lineTo(end.x, canvas.height);
          ctx.lineTo(start.x, canvas.height);
        }
      }
    } else if (element.type === 'bezier' && element.controlPoint) {
      const start = graphToCanvas(element.points[0].x, element.points[0].y);
      const end = graphToCanvas(element.points[1].x, element.points[1].y);
      const control = graphToCanvas(element.controlPoint.x, element.controlPoint.y);

      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);

      if (fillToAxis) {
        // Always fill to x-axis when fillToAxis is true
        ctx.lineTo(end.x, centerY);
        ctx.lineTo(start.x, centerY);
      } else {
        // Original behavior - fill to canvas edge
        if (fillAbove) {
          ctx.lineTo(end.x, 0);
          ctx.lineTo(start.x, 0);
        } else {
          ctx.lineTo(end.x, canvas.height);
          ctx.lineTo(start.x, canvas.height);
        }
      }
    } else if (element.type === 'freehand' || element.type === 'function') {
      // Use simplified points and Catmull-Rom spline for fill areas too
      const simplified = simplifyPoints(element.points, 0.05);
      const canvasPoints = simplified.map(p => graphToCanvas(p.x, p.y));

      ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);

      if (canvasPoints.length === 2) {
        ctx.lineTo(canvasPoints[1].x, canvasPoints[1].y);
      } else if (canvasPoints.length > 2) {
        // Catmull-Rom spline
        const tension = 0.5;

        for (let i = 0; i < canvasPoints.length - 1; i++) {
          const p0 = canvasPoints[i === 0 ? 0 : i - 1];
          const p1 = canvasPoints[i];
          const p2 = canvasPoints[i + 1];
          const p3 = canvasPoints[i + 2] || p2;

          const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
          const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
          const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
          const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      }

      const last = canvasPoints[canvasPoints.length - 1];

      if (fillToAxis) {
        // Always fill to x-axis when fillToAxis is true
        ctx.lineTo(last.x, centerY);
        ctx.lineTo(canvasPoints[0].x, centerY);
      } else {
        // Original behavior - fill to canvas edge
        if (fillAbove) {
          ctx.lineTo(last.x, 0);
          ctx.lineTo(canvasPoints[0].x, 0);
        } else {
          ctx.lineTo(last.x, canvas.height);
          ctx.lineTo(canvasPoints[0].x, canvas.height);
        }
      }
    }

    ctx.closePath();
    ctx.fill();

    // Restore canvas state (remove clipping and reset globalAlpha)
    ctx.restore();
  }, [elements, graphToCanvas, panOffset, simplifyPoints]);

  // Render everything
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx);

    // Draw fill areas first (below elements)
    fillAreas.forEach(fillArea => {
      // Only draw fills for elements that still exist
      if (fillArea.elementId < elements.length) {
        fillAreaForElement(ctx, fillArea.elementId, fillArea.fillAbove, fillArea.color, fillArea.fillToAxis || false);
      }
    });

    // Draw all elements
    elements.forEach(element => {
      if (element.type === 'line') {
        drawLine(ctx, element);
      } else if (element.type === 'bezier') {
        drawBezier(ctx, element);
      } else if (element.type === 'freehand') {
        drawFreehand(ctx, element);
      } else if (element.type === 'function') {
        drawFunction(ctx, element);
      } else if (element.type === 'point') {
        drawPoint(ctx, element);
      }
    });

    // Draw current points being placed
    if (currentPoints.length > 0 && drawMode === 'line') {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.fillStyle = strokeColor;

      currentPoints.forEach(point => {
        const canvasPoint = graphToCanvas(point.x, point.y);
        ctx.beginPath();
        ctx.arc(canvasPoint.x, canvasPoint.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw temporary bezier curve
    if (currentPoints.length === 2 && drawMode === 'bezier') {
      const start = graphToCanvas(currentPoints[0].x, currentPoints[0].y);
      const end = graphToCanvas(currentPoints[1].x, currentPoints[1].y);

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';

      if (tempControlPoint) {
        const control = graphToCanvas(tempControlPoint.x, tempControlPoint.y);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
        ctx.stroke();

        // Draw control point
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(control.x, control.y, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    }

    // Draw current freehand path with smoothing
    if (isDrawing && drawMode === 'freehand' && currentPoints.length > 1) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Simplify points for live preview
      const simplified = simplifyPoints(currentPoints, 0.05);
      const canvasPoints = simplified.map(p => graphToCanvas(p.x, p.y));

      ctx.beginPath();
      ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);

      if (canvasPoints.length === 2) {
        ctx.lineTo(canvasPoints[1].x, canvasPoints[1].y);
      } else if (canvasPoints.length > 2) {
        // Use Catmull-Rom spline for live preview too
        const tension = 0.5;

        for (let i = 0; i < canvasPoints.length - 1; i++) {
          const p0 = canvasPoints[i === 0 ? 0 : i - 1];
          const p1 = canvasPoints[i];
          const p2 = canvasPoints[i + 1];
          const p3 = canvasPoints[i + 2] || p2;

          const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
          const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
          const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
          const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      }

      ctx.stroke();
    }

    // Draw selection highlights
    if (selectedElementId !== null && selectedElementId < elements.length) {
      const selectedElement = elements[selectedElementId];

      // Draw control points for selected element
      if (selectedElement.type === 'line') {
        // Draw start and end points
        selectedElement.points.forEach((point, idx) => {
          const canvasPoint = graphToCanvas(point.x, point.y);
          ctx.fillStyle = '#E67E22';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(canvasPoint.x, canvasPoint.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      } else if (selectedElement.type === 'bezier') {
        // Draw start and end points
        selectedElement.points.forEach((point, idx) => {
          const canvasPoint = graphToCanvas(point.x, point.y);
          ctx.fillStyle = '#E67E22';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(canvasPoint.x, canvasPoint.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });

        // Draw control point
        if (selectedElement.controlPoint) {
          const controlCanvas = graphToCanvas(selectedElement.controlPoint.x, selectedElement.controlPoint.y);
          ctx.fillStyle = '#9B59B6';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(controlCanvas.x, controlCanvas.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Draw dashed lines from control point to endpoints
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = '#9B59B6';
          ctx.lineWidth = 1;

          const start = graphToCanvas(selectedElement.points[0].x, selectedElement.points[0].y);
          const end = graphToCanvas(selectedElement.points[1].x, selectedElement.points[1].y);

          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(controlCanvas.x, controlCanvas.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (selectedElement.type === 'freehand') {
        // Draw all points
        selectedElement.points.forEach((point, idx) => {
          const canvasPoint = graphToCanvas(point.x, point.y);
          ctx.fillStyle = '#E67E22';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(canvasPoint.x, canvasPoint.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      } else if (selectedElement.type === 'point') {
        // Draw selection ring around point
        const point = selectedElement.points[0];
        const canvasPoint = graphToCanvas(point.x, point.y);
        const pointSize = selectedElement.pointSize || selectedElement.lineWidth * 2;

        // Draw outer selection ring
        ctx.strokeStyle = '#E67E22';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(canvasPoint.x, canvasPoint.y, pointSize + 5, 0, Math.PI * 2);
        ctx.stroke();

        // Draw inner white ring
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvasPoint.x, canvasPoint.y, pointSize + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [drawGrid, elements, fillAreas, currentPoints, tempControlPoint, isDrawing, drawMode, strokeColor, strokeWidth, graphToCanvas, drawLine, drawBezier, drawFreehand, drawPoint, fillAreaForElement, selectedElementId, simplifyPoints]);

  // Re-render when dependencies change
  useEffect(() => {
    render();
  }, [render]);

  // Add wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();

      if (!onScaleChange) return;

      // Get mouse position in canvas coordinates
      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      // Get current center with offset
      const centerX = canvas.width / 2 + panOffset.x;
      const centerY = canvas.height / 2 + panOffset.y;

      // Calculate graph coordinates of mouse position (before zoom)
      const graphX = (canvasX - centerX) / scale.x;
      const graphY = (centerY - canvasY) / scale.y;

      // Calculate zoom factor (negative deltaY means zoom in)
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

      // Calculate new scale
      const newScaleX = Math.min(100, Math.max(10, scale.x * zoomFactor));
      const newScaleY = Math.min(100, Math.max(10, scale.y * zoomFactor));

      // Calculate new offset to keep the graph point under mouse cursor
      const newOffsetX = canvasX - graphX * newScaleX - canvas.width / 2;
      const newOffsetY2 = canvasY + graphY * newScaleY - canvas.height / 2;

      // Update scale via callback
      onScaleChange({ x: newScaleX, y: newScaleY });

      // Update pan offset
      setPanOffset({ x: newOffsetX, y: newOffsetY2 });
    };

    canvas.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', wheelHandler);
    };
  }, [scale, panOffset, onScaleChange]);

  // Notify parent when selection changes or when selected element's data changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedElementId);
    }
  }, [selectedElementId, elements, onSelectionChange]);

  // Notify parent when elements array changes
  useEffect(() => {
    if (onElementsChange) {
      onElementsChange(elements.length);
    }
  }, [elements, onElementsChange]);

  // Clear selection when switching away from select mode
  useEffect(() => {
    if (drawMode !== 'select') {
      setSelectedElementId(null);
      setDraggingPointIndex(null);
      setDraggingControlPointFlag(false);
    }
  }, [drawMode]);

  // Handle mouse/touch events
  const getEventPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        return { x: 0, y: 0 };
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    return canvasToGraph(canvasX, canvasY);
  };

  // Helper to get canvas coordinates from mouse or touch event
  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        return { x: 0, y: 0 };
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Helper: Check if a canvas point is near a graph point
  const isPointNear = (canvasX: number, canvasY: number, graphPoint: Point, threshold = 10): boolean => {
    const canvasPoint = graphToCanvas(graphPoint.x, graphPoint.y);
    const distance = Math.sqrt(
      Math.pow(canvasX - canvasPoint.x, 2) + Math.pow(canvasY - canvasPoint.y, 2)
    );
    return distance < threshold;
  };

  // Check if a point is near a line segment
  const isPointNearLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number, threshold = 10): boolean => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  };

  // Find which element was clicked
  const findClickedElement = (canvasX: number, canvasY: number): number | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];

      // Check if clicked near any control point first (higher priority)
      for (const point of element.points) {
        if (isPointNear(canvasX, canvasY, point, 15)) {
          return i;
        }
      }

      // Check control point for bezier
      if (element.type === 'bezier' && element.controlPoint) {
        if (isPointNear(canvasX, canvasY, element.controlPoint, 15)) {
          return i;
        }
      }

      // Check if clicked on the actual line/curve
      if (element.type === 'point' && element.points.length >= 1) {
        const point = graphToCanvas(element.points[0].x, element.points[0].y);
        const pointSize = element.pointSize || element.lineWidth * 2;
        const distance = Math.sqrt(
          Math.pow(canvasX - point.x, 2) + Math.pow(canvasY - point.y, 2)
        );
        if (distance <= pointSize + 5) {
          return i;
        }
      } else if (element.type === 'line' && element.points.length >= 2) {
        const start = graphToCanvas(element.points[0].x, element.points[0].y);
        const end = graphToCanvas(element.points[1].x, element.points[1].y);
        if (isPointNearLine(canvasX, canvasY, start.x, start.y, end.x, end.y, 8)) {
          return i;
        }
      } else if (element.type === 'freehand') {
        // Check all line segments in freehand
        for (let j = 0; j < element.points.length - 1; j++) {
          const p1 = graphToCanvas(element.points[j].x, element.points[j].y);
          const p2 = graphToCanvas(element.points[j + 1].x, element.points[j + 1].y);
          if (isPointNearLine(canvasX, canvasY, p1.x, p1.y, p2.x, p2.y, 8)) {
            return i;
          }
        }
      } else if (element.type === 'bezier' && element.points.length >= 2 && element.controlPoint) {
        // Sample points along the bezier curve and check
        const start = graphToCanvas(element.points[0].x, element.points[0].y);
        const end = graphToCanvas(element.points[1].x, element.points[1].y);
        const control = graphToCanvas(element.controlPoint.x, element.controlPoint.y);

        // Sample 20 points along the curve
        for (let t = 0; t < 1; t += 0.05) {
          const t1 = 1 - t;
          const x = t1 * t1 * start.x + 2 * t1 * t * control.x + t * t * end.x;
          const y = t1 * t1 * start.y + 2 * t1 * t * control.y + t * t * end.y;

          const dx = canvasX - x;
          const dy = canvasY - y;
          if (Math.sqrt(dx * dx + dy * dy) < 8) {
            return i;
          }
        }
      }
    }
    return null;
  };

  // Find which point of selected element was clicked
  const findClickedPoint = (canvasX: number, canvasY: number, elementId: number): { type: 'point' | 'control'; index: number } | null => {
    const element = elements[elementId];
    if (!element) return null;

    // Check regular points
    for (let i = 0; i < element.points.length; i++) {
      if (isPointNear(canvasX, canvasY, element.points[i], 15)) {
        return { type: 'point', index: i };
      }
    }

    // Check control point for bezier
    if (element.type === 'bezier' && element.controlPoint) {
      if (isPointNear(canvasX, canvasY, element.controlPoint, 15)) {
        return { type: 'control', index: 0 };
      }
    }

    return null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const point = getEventPoint(e);

    if (drawMode === 'select') {
      // Selection mode: find and select element
      const { x: canvasX, y: canvasY } = getCanvasCoordinates(e);

      const clickedElement = findClickedElement(canvasX, canvasY);
      setSelectedElementId(clickedElement);
      return;
    }

    if (drawMode === 'line') {
      if (currentPoints.length === 0) {
        setCurrentPoints([point]);
      } else if (currentPoints.length === 1) {
        const newElement: GraphElement = {
          type: 'line',
          points: [currentPoints[0], point],
          color: strokeColor,
          lineWidth: strokeWidth
        };
        setElements(prev => [...prev, newElement]);
        setActionHistory(prev => [...prev, { type: 'element' }]);
        setCurrentPoints([]);
      }
    } else if (drawMode === 'bezier') {
      if (currentPoints.length === 0) {
        setCurrentPoints([point]);
      } else if (currentPoints.length === 1) {
        const midpoint = {
          x: (currentPoints[0].x + point.x) / 2,
          y: (currentPoints[0].y + point.y) / 2
        };
        setCurrentPoints([currentPoints[0], point]);
        setTempControlPoint(midpoint);
      }
    } else if (drawMode === 'point') {
      // Create point with default projection off
      const newElement: GraphElement = {
        type: 'point',
        points: [point],
        color: strokeColor,
        lineWidth: strokeWidth,
        pointSize: strokeWidth * 2,
        showProjection: false
      };
      const newElementId = elements.length;
      setElements(prev => [...prev, newElement]);
      setActionHistory(prev => [...prev, { type: 'element' }]);
      // Auto-select the newly created point
      setSelectedElementId(newElementId);
    }

    onCoordinateClick?.(point);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x: canvasX, y: canvasY } = getCanvasCoordinates(e);

    if (drawMode === 'select' && selectedElementId !== null) {
      // Check if clicking on a control point of selected element
      const clickedPoint = findClickedPoint(canvasX, canvasY, selectedElementId);
      if (clickedPoint) {
        if (clickedPoint.type === 'point') {
          setDraggingPointIndex(clickedPoint.index);
        } else {
          setDraggingControlPointFlag(true);
        }
      }
    } else if (drawMode === 'freehand') {
      const point = getEventPoint(e);
      setIsDrawing(true);
      setCurrentPoints([point]);
    } else if (drawMode === 'bezier' && currentPoints.length === 2 && tempControlPoint) {
      const controlCanvas = graphToCanvas(tempControlPoint.x, tempControlPoint.y);
      const distance = Math.sqrt(
        Math.pow(canvasX - controlCanvas.x, 2) + Math.pow(canvasY - controlCanvas.y, 2)
      );

      if (distance < 10) {
        setDraggingControl(true);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const point = getEventPoint(e);

    if (drawMode === 'select' && selectedElementId !== null) {
      // Dragging a control point
      if (draggingPointIndex !== null) {
        setElements(prev => {
          const newElements = [...prev];
          const element = { ...newElements[selectedElementId] };
          element.points = [...element.points];
          element.points[draggingPointIndex] = point;
          newElements[selectedElementId] = element;
          return newElements;
        });
      } else if (draggingControlPointFlag) {
        // Dragging bezier control point
        setElements(prev => {
          const newElements = [...prev];
          const element = { ...newElements[selectedElementId] };
          if (element.type === 'bezier') {
            element.controlPoint = point;
          }
          newElements[selectedElementId] = element;
          return newElements;
        });
      }
    } else if (drawMode === 'freehand' && isDrawing) {
      setCurrentPoints(prev => [...prev, point]);
    } else if (drawMode === 'bezier' && draggingControl) {
      setTempControlPoint(point);
    }
  };

  const handleMouseUp = () => {
    // Reset dragging states
    setDraggingPointIndex(null);
    setDraggingControlPointFlag(false);

    if (drawMode === 'freehand' && isDrawing && currentPoints.length > 1) {
      const newElement: GraphElement = {
        type: 'freehand',
        points: currentPoints,
        color: strokeColor,
        lineWidth: strokeWidth
      };
      setElements(prev => [...prev, newElement]);
      setActionHistory(prev => [...prev, { type: 'element' }]);
      setCurrentPoints([]);
      setIsDrawing(false);
    } else if (drawMode === 'bezier' && draggingControl) {
      if (currentPoints.length === 2 && tempControlPoint) {
        const newElement: GraphElement = {
          type: 'bezier',
          points: currentPoints,
          controlPoint: tempControlPoint,
          color: strokeColor,
          lineWidth: strokeWidth
        };
        setElements(prev => [...prev, newElement]);
        setActionHistory(prev => [...prev, { type: 'element' }]);
        setCurrentPoints([]);
        setTempControlPoint(null);
      }
      setDraggingControl(false);
    }
  };

  // Public methods exposed via ref
  const addLineByCoordinates = useCallback((start: Point, end: Point) => {
    const newElement: GraphElement = {
      type: 'line',
      points: [start, end],
      color: strokeColor,
      lineWidth: strokeWidth
    };
    setElements(prev => [...prev, newElement]);
    setActionHistory(prev => [...prev, { type: 'element' }]);
  }, [strokeColor, strokeWidth]);

  const addFillArea = useCallback((elementId: number, fillAbove: boolean, color: string, fillToAxis: boolean = false) => {
    setFillAreas(prev => [...prev, { elementId, fillAbove, color, fillToAxis }]);
    setActionHistory(prev => [...prev, { type: 'fill' }]);
  }, []);

  const addFunction = useCallback((formula: string, xMin: number, xMax: number, color: string, lineWidth: number) => {
    try {
      const parser = new Parser();
      const expr = parser.parse(formula);

      // Sample points across the range
      const numSamples = 500; // High resolution for smooth curves
      const step = (xMax - xMin) / numSamples;
      const points: Point[] = [];

      for (let i = 0; i <= numSamples; i++) {
        const x = xMin + i * step;
        try {
          const y = expr.evaluate({ x });

          // Only add valid points (not NaN, not Infinity)
          if (isFinite(y)) {
            points.push({ x, y });
          } else {
            // If we encounter an invalid point, break the curve
            if (points.length > 1) {
              // Create element with points so far
              const newElement: GraphElement = {
                type: 'function',
                points: [...points],
                color,
                lineWidth,
                formula,
                xMin,
                xMax
              };
              setElements(prev => [...prev, newElement]);
              setActionHistory(prev => [...prev, { type: 'element' }]);
            }
            points.length = 0; // Start new segment
          }
        } catch {
          // Skip invalid points
          continue;
        }
      }

      // Add the final element if we have points
      if (points.length > 1) {
        const newElement: GraphElement = {
          type: 'function',
          points,
          color,
          lineWidth,
          formula,
          xMin,
          xMax
        };
        setElements(prev => [...prev, newElement]);
        setActionHistory(prev => [...prev, { type: 'element' }]);
      }
    } catch (error) {
      console.error('Error evaluating function:', error);
      throw new Error(`Invalid function: ${formula}`);
    }
  }, []);

  const clearCanvas = useCallback(() => {
    setElements([]);
    setFillAreas([]);
    setActionHistory([]);
    setCurrentPoints([]);
    setTempControlPoint(null);
    setSelectedElementId(null);
    setDraggingPointIndex(null);
    setDraggingControlPointFlag(false);
  }, []);

  const undo = useCallback(() => {
    // Prevent duplicate undo operations
    if (undoInProgressRef.current) {
      return;
    }

    undoInProgressRef.current = true;

    flushSync(() => {
      setActionHistory(prevHistory => {
        if (prevHistory.length === 0) {
          undoInProgressRef.current = false;
          return prevHistory;
        }

        const lastAction = prevHistory[prevHistory.length - 1];
        const newHistory = prevHistory.slice(0, -1);

        // Update elements or fills based on the action type
        if (lastAction.type === 'element') {
          setElements(prev => {
            if (prev.length === 0) return prev;
            const newElements = prev.slice(0, -1);
            // Clear selection if we're removing the selected element
            setSelectedElementId(current => {
              if (current !== null && current >= newElements.length) {
                return null;
              }
              return current;
            });
            return newElements;
          });
        } else if (lastAction.type === 'fill') {
          setFillAreas(prev => {
            if (prev.length === 0) return prev;
            return prev.slice(0, -1);
          });
        } else if (lastAction.type === 'modify') {
          // Restore the previous state of the modified element
          setElements(prev => {
            const newElements = [...prev];
            if (lastAction.elementId < newElements.length) {
              newElements[lastAction.elementId] = { ...lastAction.previousState };
            }
            return newElements;
          });
        }

        return newHistory;
      });
    });

    // Reset the flag
    undoInProgressRef.current = false;
  }, []);

  const togglePointProjection = useCallback((elementId: number) => {
    if (elementId < 0 || elementId >= elements.length) return;
    if (elements[elementId].type !== 'point') return;

    setElements(prev => {
      const newElements = [...prev];
      newElements[elementId] = {
        ...newElements[elementId],
        showProjection: !newElements[elementId].showProjection
      };
      return newElements;
    });
  }, [elements]);

  const exportToPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create download link
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `easygraphs-${timestamp}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  }, []);

  const getExportData = useCallback((): GraphExportData => {
    return {
      elements: [...elements],
      fillAreas: [...fillAreas],
      panOffset: { ...panOffset }
    };
  }, [elements, fillAreas, panOffset]);

  const importData = useCallback((data: GraphExportData) => {
    // Clear current state
    setSelectedElementId(null);
    setDraggingPointIndex(null);
    setDraggingControlPointFlag(false);
    setCurrentPoints([]);
    setTempControlPoint(null);

    // Import new data
    setElements(data.elements || []);
    setFillAreas(data.fillAreas || []);
    setPanOffset(data.panOffset || { x: 0, y: 0 });

    // Rebuild action history for undo functionality
    const history: Action[] = [];
    data.elements.forEach(() => history.push({ type: 'element' }));
    data.fillAreas.forEach(() => history.push({ type: 'fill' }));
    setActionHistory(history);

    // Notify parent of element count change
    if (onElementsChange) {
      onElementsChange(data.elements.length);
    }
  }, [onElementsChange]);

  const getSelectedElement = useCallback(() => {
    if (selectedElementId === null || selectedElementId >= elements.length) {
      return null;
    }
    return elements[selectedElementId];
  }, [selectedElementId, elements]);

  const getSelectedElementId = useCallback(() => {
    return selectedElementId;
  }, [selectedElementId]);

  const updateSelectedElement = useCallback((color: string, lineWidth: number) => {
    if (selectedElementId === null || selectedElementId >= elements.length) {
      return;
    }

    const currentElement = elements[selectedElementId];

    // Only update if something actually changed
    if (currentElement.color === color && currentElement.lineWidth === lineWidth) {
      return;
    }

    // Save the previous state for undo
    const previousElement = { ...currentElement };

    setElements(prev => {
      const newElements = [...prev];
      const element = { ...newElements[selectedElementId] };
      element.color = color;
      element.lineWidth = lineWidth;
      newElements[selectedElementId] = element;
      return newElements;
    });

    // Add modification to action history
    setActionHistory(prev => [...prev, {
      type: 'modify',
      elementId: selectedElementId,
      previousState: previousElement
    }]);
  }, [selectedElementId, elements]);

  // Expose methods via imperative handle
  useImperativeHandle(ref, () => ({
    addLineByCoordinates,
    addFillArea,
    addFunction,
    clearCanvas,
    undo,
    getElements: () => elements,
    exportToPNG,
    getSelectedElement,
    getSelectedElementId,
    updateSelectedElement,
    getExportData,
    importData,
    togglePointProjection
  }), [addLineByCoordinates, addFillArea, addFunction, clearCanvas, undo, elements, exportToPNG, getSelectedElement, getSelectedElementId, updateSelectedElement, getExportData, importData, togglePointProjection]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="cursor-crosshair touch-none rounded"
      style={{
        border: '2px solid var(--canvas-border)',
        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.5)'
      }}
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={(e) => {
        e.preventDefault();
        handleMouseDown(e);
        // For touch devices, also handle click logic on touch start
        if (drawMode === 'line' || drawMode === 'bezier' || drawMode === 'select' || drawMode === 'point') {
          handleCanvasClick(e);
        }
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        handleMouseMove(e);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        handleMouseUp();
      }}
    />
  );
});

GraphCanvas.displayName = 'GraphCanvas';

export default GraphCanvas;
