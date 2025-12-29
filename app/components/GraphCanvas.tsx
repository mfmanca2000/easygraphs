'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { flushSync } from 'react-dom';
import { Parser } from 'expr-eval';

export type DrawMode = 'line' | 'bezier' | 'freehand' | 'fill' | 'select' | 'function' | 'point' | 'textbox';

export type Action =
  | { type: 'element' }
  | { type: 'fill' }
  | { type: 'modify'; elementId: number; previousState: GraphElement }
  | { type: 'label'; previousState: GraphLabels };

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

// Label coordinate system type
export type LabelCoordinateSystem = 'graph' | 'canvas';

// Axis labels
export interface AxisLabels {
  xLabel: string;
  yLabel: string;
  fontFamily: string;
  fontSize: number;
  color: string;
}

// Graph title
export interface GraphTitle {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  yOffset: number; // Pixels from top
}

// Element label (attached to specific elements)
export interface ElementLabel {
  elementId: number;
  text: string;
  offsetX: number; // Offset from element reference point
  offsetY: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  anchorPoint?: 'start' | 'middle' | 'end';
}

// Text box (draggable/resizable)
export interface TextBox {
  id: string; // UUID
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  padding: number;
  coordinateSystem: LabelCoordinateSystem;
}

// Complete labels collection
export interface GraphLabels {
  axisLabels: AxisLabels;
  title: GraphTitle;
  elementLabels: ElementLabel[];
  textBoxes: TextBox[];
}

// Default labels
export const DEFAULT_LABELS: GraphLabels = {
  axisLabels: {
    xLabel: '',
    yLabel: '',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 14,
    color: '#2B5F82'
  },
  title: {
    text: '',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 20,
    color: '#1A2332',
    yOffset: 20
  },
  elementLabels: [],
  textBoxes: []
};

export interface GraphExportData {
  elements: GraphElement[];
  fillAreas: FillArea[];
  panOffset: Point;
  labels: GraphLabels;
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
    labels: GraphLabels;
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
  onLabelsChange?: (labels: GraphLabels) => void;
}

export interface GraphCanvasHandle {
  addLineByCoordinates: (start: Point, end: Point) => void;
  addFillArea: (elementId: number, fillAbove: boolean, color: string, fillToAxis?: boolean) => void;
  addFunction: (formula: string, xMin: number, xMax: number, color: string, lineWidth: number) => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  getElements: () => GraphElement[];
  exportToPNG: () => void;
  getSelectedElement: () => GraphElement | null;
  getSelectedElementId: () => number | null;
  updateSelectedElement: (color: string, lineWidth: number, addToHistory?: boolean, previousState?: GraphElement) => void;
  addModifyAction: (elementId: number, previousState: GraphElement) => void;
  getExportData: () => GraphExportData;
  importData: (data: GraphExportData) => void;
  togglePointProjection: (elementId: number) => void;
  getLabels: () => GraphLabels;
  updateLabels: (newLabels: GraphLabels, addToHistory?: boolean) => void;
  addTextBox: (textBox: TextBox) => void;
  deleteTextBox: (id: string) => void;
  selectTextBox: (id: string) => void;
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
    onScaleChange,
    onLabelsChange
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<GraphElement[]>([]);
  const [fillAreas, setFillAreas] = useState<FillArea[]>([]);
  const [actionHistory, setActionHistory] = useState<Action[]>([]);
  const [redoHistory, setRedoHistory] = useState<Action[]>([]);
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

  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const justPannedRef = useRef(false);

  // Ref to prevent duplicate undo operations
  const undoInProgressRef = useRef(false);

  // Label state
  const [labels, setLabels] = useState<GraphLabels>(DEFAULT_LABELS);
  const [selectedTextBoxId, setSelectedTextBoxId] = useState<string | null>(null);
  const [draggingTextBox, setDraggingTextBox] = useState<string | null>(null);
  const [resizingTextBox, setResizingTextBox] = useState<{
    id: string;
    corner: 'ne' | 'se' | 'sw' | 'nw';
  } | null>(null);
  const [textBoxDragOffset, setTextBoxDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [selectedElementLabelIndex, setSelectedElementLabelIndex] = useState<number | null>(null);
  const [draggingElementLabel, setDraggingElementLabel] = useState<number | null>(null);
  const labelsDragStartRef = useRef<GraphLabels | null>(null);

  // Calculate title offset (space reserved at top for title)
  const getTitleOffset = useCallback((): number => {
    if (!labels.title.text) return 0;
    // Reserve space: yOffset + fontSize + bottom padding
    return labels.title.yOffset + labels.title.fontSize + 20;
  }, [labels.title]);

  // Convert canvas coordinates to graph coordinates
  const canvasToGraph = useCallback((canvasX: number, canvasY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const titleOffset = getTitleOffset();
    const centerX = canvas.width / 2 + panOffset.x;
    const centerY = (canvas.height + titleOffset) / 2 + panOffset.y;

    return {
      x: ((canvasX - centerX) / scale.x),
      y: ((centerY - canvasY) / scale.y)
    };
  }, [scale, panOffset, getTitleOffset]);

  // Convert graph coordinates to canvas coordinates
  const graphToCanvas = useCallback((graphX: number, graphY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const titleOffset = getTitleOffset();
    const centerX = canvas.width / 2 + panOffset.x;
    const centerY = (canvas.height + titleOffset) / 2 + panOffset.y;

    return {
      x: centerX + graphX * scale.x,
      y: centerY - graphY * scale.y
    };
  }, [scale, panOffset, getTitleOffset]);

  // Draw grid
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const titleOffset = getTitleOffset();
    const centerX = canvas.width / 2 + panOffset.x;
    const centerY = (canvas.height + titleOffset) / 2 + panOffset.y;

    // Draw grid lines if enabled
    if (showGrid) {
      ctx.strokeStyle = '#D4E4EC';
      ctx.lineWidth = 1;

      // Calculate visible graph coordinate range
      const leftEdge = (0 - centerX) / scale.x;
      const rightEdge = (canvas.width - centerX) / scale.x;
      const topEdge = (centerY - titleOffset) / scale.y;
      const bottomEdge = (centerY - canvas.height) / scale.y;

      // Draw vertical grid lines (only in graph area, below title)
      for (let i = Math.floor(leftEdge); i <= Math.ceil(rightEdge); i++) {
        const x = centerX + i * scale.x;
        ctx.beginPath();
        ctx.moveTo(x, titleOffset);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw horizontal grid lines (only in graph area, below title)
      for (let i = Math.floor(bottomEdge); i <= Math.ceil(topEdge); i++) {
        const y = centerY - i * scale.y;
        if (y >= titleOffset) { // Only draw if below title area
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }
    }

    // Always draw axes (even if grid is hidden)
    ctx.strokeStyle = '#2B5F82';
    ctx.lineWidth = 2;

    // X-axis
    if (centerY >= titleOffset) { // Only draw if below title area
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width, centerY);
      ctx.stroke();
    }

    // Y-axis (only in graph area, below title)
    ctx.beginPath();
    ctx.moveTo(centerX, titleOffset);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();

    // Draw axis units if enabled
    if (showAxisUnits) {
      ctx.fillStyle = '#2B5F82';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Calculate visible graph coordinate range
      const leftEdge = (0 - centerX) / scale.x;
      const rightEdge = (canvas.width - centerX) / scale.x;
      const topEdge = (centerY - 0) / scale.y;
      const bottomEdge = (centerY - canvas.height) / scale.y;

      // X-axis units
      for (let i = Math.floor(leftEdge); i <= Math.ceil(rightEdge); i++) {
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
      for (let i = Math.floor(bottomEdge); i <= Math.ceil(topEdge); i++) {
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
  }, [showGrid, showAxisUnits, scale, panOffset, getTitleOffset]);

  // Helper function to wrap text to fit within a given width
  const wrapText = useCallback((ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }, []);

  // Render all labels (axis labels, title, element labels, text boxes)
  const renderLabels = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const titleOffset = getTitleOffset();

    // 1. Graph title (drawn in the reserved area at the top)
    if (labels.title.text) {
      ctx.save();
      ctx.fillStyle = labels.title.color;
      ctx.font = `bold ${labels.title.fontSize}px ${labels.title.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(labels.title.text, canvas.width / 2, labels.title.yOffset);
      ctx.restore();
    }

    // 2. Axis labels (positioned relative to the axes)
    const centerX = canvas.width / 2 + panOffset.x;
    const centerY = (canvas.height + titleOffset) / 2 + panOffset.y;

    if (labels.axisLabels.xLabel && centerY >= titleOffset && centerY <= canvas.height) {
      ctx.save();
      ctx.fillStyle = labels.axisLabels.color;
      ctx.font = `${labels.axisLabels.fontSize}px ${labels.axisLabels.fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      // Position to the right of the X-axis, below the axis units
      ctx.fillText(labels.axisLabels.xLabel, canvas.width - 10, centerY + 20);
      ctx.restore();
    }

    if (labels.axisLabels.yLabel && centerX >= 0 && centerX <= canvas.width) {
      ctx.save();
      ctx.fillStyle = labels.axisLabels.color;
      ctx.font = `${labels.axisLabels.fontSize}px ${labels.axisLabels.fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      // Position at the top of the Y-axis, to the left of the axis units
      ctx.translate(centerX - 20, titleOffset + 10);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(labels.axisLabels.yLabel, 0, 0);
      ctx.restore();
    }

    // 3. Element labels
    labels.elementLabels.forEach((label, index) => {
      const element = elements[label.elementId];
      if (!element) return;

      let refPoint: Point;
      // Determine reference point based on element type
      if (element.type === 'point') {
        refPoint = element.points[0];
      } else if (element.type === 'line' || element.type === 'bezier') {
        refPoint = {
          x: (element.points[0].x + element.points[1].x) / 2,
          y: (element.points[0].y + element.points[1].y) / 2
        };
      } else {
        refPoint = element.points[Math.floor(element.points.length / 2)];
      }

      const canvasPoint = graphToCanvas(refPoint.x, refPoint.y);
      const labelX = canvasPoint.x + label.offsetX;
      const labelY = canvasPoint.y + label.offsetY;

      ctx.save();

      // Show selection highlight if this label is selected
      if (selectedElementLabelIndex === index) {
        ctx.font = `${label.fontSize}px ${label.fontFamily}`;
        const textMetrics = ctx.measureText(label.text);
        const textWidth = textMetrics.width;
        const textHeight = label.fontSize;

        // Draw background
        ctx.fillStyle = 'rgba(230, 126, 34, 0.2)';
        ctx.fillRect(labelX - 2, labelY - textHeight - 2, textWidth + 4, textHeight + 4);

        // Draw border
        ctx.strokeStyle = '#E67E22';
        ctx.lineWidth = 2;
        ctx.strokeRect(labelX - 2, labelY - textHeight - 2, textWidth + 4, textHeight + 4);
      }

      ctx.fillStyle = label.color;
      ctx.font = `${label.fontSize}px ${label.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label.text, labelX, labelY);
      ctx.restore();
    });

    // 4. Text boxes
    labels.textBoxes.forEach(textBox => {
      let x = textBox.x;
      let y = textBox.y;

      if (textBox.coordinateSystem === 'graph') {
        const canvasPoint = graphToCanvas(textBox.x, textBox.y);
        x = canvasPoint.x;
        y = canvasPoint.y;
      }

      // Selection highlight if selected
      if (selectedTextBoxId === textBox.id) {
        ctx.fillStyle = 'rgba(230, 126, 34, 0.2)';
        ctx.fillRect(x - 4, y - 4, textBox.width + 8, textBox.height + 8);
        ctx.strokeStyle = '#E67E22';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 4, y - 4, textBox.width + 8, textBox.height + 8);
      }

      // Background
      ctx.fillStyle = textBox.backgroundColor;
      ctx.fillRect(x, y, textBox.width, textBox.height);

      // Border
      ctx.strokeStyle = textBox.borderColor;
      ctx.lineWidth = textBox.borderWidth;
      ctx.strokeRect(x, y, textBox.width, textBox.height);

      // Text with wrapping
      ctx.fillStyle = textBox.color;
      ctx.font = `${textBox.fontSize}px ${textBox.fontFamily}`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';

      const lines = wrapText(ctx, textBox.text, textBox.width - textBox.padding * 2);
      const lineHeight = textBox.fontSize * 1.2;

      lines.forEach((line, i) => {
        ctx.fillText(line, x + textBox.padding, y + textBox.padding + i * lineHeight);
      });

      // Resize handles if selected
      if (selectedTextBoxId === textBox.id) {
        const handleSize = 8;
        ctx.fillStyle = '#E67E22';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;

        const corners = [
          { x, y },
          { x: x + textBox.width, y },
          { x: x + textBox.width, y: y + textBox.height },
          { x, y: y + textBox.height }
        ];

        corners.forEach(corner => {
          ctx.beginPath();
          ctx.arc(corner.x, corner.y, handleSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }
    });
  }, [labels, elements, graphToCanvas, selectedTextBoxId, wrapText, getTitleOffset, panOffset, selectedElementLabelIndex]);

  // Helper function to check if a point is inside a text box
  const isPointInTextBox = useCallback((canvasX: number, canvasY: number, textBox: TextBox): boolean => {
    let x = textBox.x;
    let y = textBox.y;
    if (textBox.coordinateSystem === 'graph') {
      const canvasPoint = graphToCanvas(textBox.x, textBox.y);
      x = canvasPoint.x;
      y = canvasPoint.y;
    }
    return canvasX >= x && canvasX <= x + textBox.width &&
           canvasY >= y && canvasY <= y + textBox.height;
  }, [graphToCanvas]);

  // Helper function to get which resize handle is being clicked
  const getResizeHandle = useCallback((canvasX: number, canvasY: number, textBox: TextBox): 'ne' | 'se' | 'sw' | 'nw' | null => {
    let x = textBox.x;
    let y = textBox.y;
    if (textBox.coordinateSystem === 'graph') {
      const canvasPoint = graphToCanvas(textBox.x, textBox.y);
      x = canvasPoint.x;
      y = canvasPoint.y;
    }

    const handleSize = 8;
    const corners = [
      { corner: 'nw' as const, x, y },
      { corner: 'ne' as const, x: x + textBox.width, y },
      { corner: 'se' as const, x: x + textBox.width, y: y + textBox.height },
      { corner: 'sw' as const, x, y: y + textBox.height }
    ];

    for (const { corner, x: cx, y: cy } of corners) {
      const distance = Math.sqrt((canvasX - cx) ** 2 + (canvasY - cy) ** 2);
      if (distance <= handleSize) return corner;
    }
    return null;
  }, [graphToCanvas]);

  // Helper function to find which text box was clicked
  const findClickedTextBox = useCallback((canvasX: number, canvasY: number): string | null => {
    // Iterate in reverse order to prioritize top-most text boxes
    for (let i = labels.textBoxes.length - 1; i >= 0; i--) {
      if (isPointInTextBox(canvasX, canvasY, labels.textBoxes[i])) {
        return labels.textBoxes[i].id;
      }
    }
    return null;
  }, [labels.textBoxes, isPointInTextBox]);

  // Helper function to check if a point is inside an element label
  const isPointInElementLabel = useCallback((canvasX: number, canvasY: number, label: ElementLabel, index: number): boolean => {
    const element = elements[label.elementId];
    if (!element) return false;

    let refPoint: Point;
    // Determine reference point based on element type
    if (element.type === 'point') {
      refPoint = element.points[0];
    } else if (element.type === 'line' || element.type === 'bezier') {
      refPoint = {
        x: (element.points[0].x + element.points[1].x) / 2,
        y: (element.points[0].y + element.points[1].y) / 2
      };
    } else {
      refPoint = element.points[Math.floor(element.points.length / 2)];
    }

    const canvasPoint = graphToCanvas(refPoint.x, refPoint.y);
    const labelX = canvasPoint.x + label.offsetX;
    const labelY = canvasPoint.y + label.offsetY;

    // Create a temporary canvas context to measure text
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.font = `${label.fontSize}px ${label.fontFamily}`;
    const textMetrics = ctx.measureText(label.text);
    const textWidth = textMetrics.width;
    const textHeight = label.fontSize;

    return canvasX >= labelX - 2 &&
           canvasX <= labelX + textWidth + 2 &&
           canvasY >= labelY - textHeight - 2 &&
           canvasY <= labelY + 2;
  }, [elements, graphToCanvas]);

  // Helper function to find which element label was clicked
  const findClickedElementLabel = useCallback((canvasX: number, canvasY: number): number | null => {
    // Iterate in reverse order to prioritize top-most labels
    for (let i = labels.elementLabels.length - 1; i >= 0; i--) {
      if (isPointInElementLabel(canvasX, canvasY, labels.elementLabels[i], i)) {
        return i;
      }
    }
    return null;
  }, [labels.elementLabels, isPointInElementLabel]);

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

    const titleOffset = getTitleOffset();
    const centerY = (canvas.height + titleOffset) / 2 + panOffset.y;

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
  }, [elements, graphToCanvas, panOffset, simplifyPoints, getTitleOffset]);

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

    // Render all labels
    renderLabels(ctx);

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
  }, [drawGrid, elements, fillAreas, currentPoints, tempControlPoint, isDrawing, drawMode, strokeColor, strokeWidth, graphToCanvas, drawLine, drawBezier, drawFreehand, drawPoint, drawFunction, fillAreaForElement, selectedElementId, simplifyPoints, renderLabels]);

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

      // Calculate title offset
      const titleOffset = getTitleOffset();

      // Get current center with offset
      const centerX = canvas.width / 2 + panOffset.x;
      const centerY = (canvas.height + titleOffset) / 2 + panOffset.y;

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
      const newOffsetY2 = canvasY + graphY * newScaleY - (canvas.height + titleOffset) / 2;

      // Update scale via callback
      onScaleChange({ x: newScaleX, y: newScaleY });

      // Update pan offset
      setPanOffset({ x: newOffsetX, y: newOffsetY2 });
    };

    canvas.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', wheelHandler);
    };
  }, [scale, panOffset, onScaleChange, getTitleOffset]);

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
    // Ignore clicks when panning or just after panning
    if (isPanning || justPannedRef.current) {
      justPannedRef.current = false;
      return;
    }

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
        setRedoHistory([]);
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
      setRedoHistory([]);
      // Auto-select the newly created point
      setSelectedElementId(newElementId);
    }

    onCoordinateClick?.(point);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x: canvasX, y: canvasY } = getCanvasCoordinates(e);

    // Check if CTRL key is pressed (for panning)
    const isCtrlPressed = 'ctrlKey' in e && e.ctrlKey;

    if (isCtrlPressed) {
      // Start panning
      setIsPanning(true);
      setPanStart({ x: canvasX, y: canvasY });
      return;
    }

    // Handle text box mode
    if (drawMode === 'textbox') {
      const clickedTextBoxId = findClickedTextBox(canvasX, canvasY);

      if (clickedTextBoxId) {
        const textBox = labels.textBoxes.find(tb => tb.id === clickedTextBoxId);
        if (textBox) {
          const handle = getResizeHandle(canvasX, canvasY, textBox);
          if (handle) {
            setResizingTextBox({ id: clickedTextBoxId, corner: handle });
            return;
          }

          setSelectedTextBoxId(clickedTextBoxId);
          setDraggingTextBox(clickedTextBoxId);
          let x = textBox.x;
          let y = textBox.y;
          if (textBox.coordinateSystem === 'graph') {
            const cp = graphToCanvas(textBox.x, textBox.y);
            x = cp.x;
            y = cp.y;
          }
          setTextBoxDragOffset({ x: canvasX - x, y: canvasY - y });
          return;
        }
      } else {
        // Click on empty area
        if (selectedTextBoxId !== null) {
          // If a text box is already selected, deselect it
          setSelectedTextBoxId(null);
        } else {
          // If no text box is selected, create a new one
          const newTextBox: TextBox = {
            id: crypto.randomUUID(),
            text: 'New Text Box',
            x: canvasX - 100, // Center the 200px wide box at click position
            y: canvasY - 50,  // Center the 100px tall box at click position
            width: 200,
            height: 100,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            color: '#1A2332',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#2B5F82',
            borderWidth: 2,
            padding: 10,
            coordinateSystem: 'canvas'
          };

          const previousLabels = { ...labels };
          const updatedLabels = {
            ...labels,
            textBoxes: [...labels.textBoxes, newTextBox]
          };
          setLabels(updatedLabels);
          setActionHistory(prev => [...prev, {
            type: 'label',
            previousState: previousLabels
          }]);
          setRedoHistory([]);
          setSelectedTextBoxId(newTextBox.id);

          // Notify parent component
          if (onLabelsChange) {
            onLabelsChange(updatedLabels);
          }
        }
        return;
      }
    }

    // Check for text box clicks in select mode
    if (drawMode === 'select') {
      const clickedTextBoxId = findClickedTextBox(canvasX, canvasY);
      if (clickedTextBoxId) {
        const textBox = labels.textBoxes.find(tb => tb.id === clickedTextBoxId);
        if (textBox) {
          const handle = getResizeHandle(canvasX, canvasY, textBox);
          if (handle) {
            setResizingTextBox({ id: clickedTextBoxId, corner: handle });
            setSelectedTextBoxId(clickedTextBoxId);
            return;
          }

          setSelectedTextBoxId(clickedTextBoxId);
          setDraggingTextBox(clickedTextBoxId);
          let x = textBox.x;
          let y = textBox.y;
          if (textBox.coordinateSystem === 'graph') {
            const cp = graphToCanvas(textBox.x, textBox.y);
            x = cp.x;
            y = cp.y;
          }
          setTextBoxDragOffset({ x: canvasX - x, y: canvasY - y });
          return;
        }
      }
    }

    // Check for element label clicks (works in all modes)
    const clickedElementLabelIndex = findClickedElementLabel(canvasX, canvasY);
    if (clickedElementLabelIndex !== null) {
      setSelectedElementLabelIndex(clickedElementLabelIndex);
      setDraggingElementLabel(clickedElementLabelIndex);
      // Save current labels state for undo
      labelsDragStartRef.current = { ...labels };
      return;
    } else if (drawMode !== 'textbox') {
      // Clear element label selection if clicking elsewhere (but not in textbox mode)
      setSelectedElementLabelIndex(null);
    }

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
    const { x: canvasX, y: canvasY } = getCanvasCoordinates(e);

    // Handle panning
    if (isPanning && panStart) {
      const deltaX = canvasX - panStart.x;
      const deltaY = canvasY - panStart.y;

      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));

      setPanStart({ x: canvasX, y: canvasY });
      return;
    }

    // Handle text box dragging
    if (draggingTextBox) {
      setLabels(prev => ({
        ...prev,
        textBoxes: prev.textBoxes.map(tb =>
          tb.id === draggingTextBox
            ? { ...tb, x: canvasX - textBoxDragOffset.x, y: canvasY - textBoxDragOffset.y, coordinateSystem: 'canvas' as const }
            : tb
        )
      }));
      return;
    }

    // Handle text box resizing
    if (resizingTextBox) {
      const textBox = labels.textBoxes.find(tb => tb.id === resizingTextBox.id);
      if (textBox) {
        let x = textBox.x;
        let y = textBox.y;
        if (textBox.coordinateSystem === 'graph') {
          const cp = graphToCanvas(textBox.x, textBox.y);
          x = cp.x;
          y = cp.y;
        }

        let newX = x;
        let newY = y;
        let newW = textBox.width;
        let newH = textBox.height;

        switch (resizingTextBox.corner) {
          case 'nw':
            newX = canvasX;
            newY = canvasY;
            newW += x - canvasX;
            newH += y - canvasY;
            break;
          case 'ne':
            newY = canvasY;
            newW = canvasX - x;
            newH += y - canvasY;
            break;
          case 'se':
            newW = canvasX - x;
            newH = canvasY - y;
            break;
          case 'sw':
            newX = canvasX;
            newW += x - canvasX;
            newH = canvasY - y;
            break;
        }

        newW = Math.max(50, newW);
        newH = Math.max(30, newH);

        setLabels(prev => ({
          ...prev,
          textBoxes: prev.textBoxes.map(tb =>
            tb.id === resizingTextBox.id
              ? { ...tb, x: newX, y: newY, width: newW, height: newH, coordinateSystem: 'canvas' as const }
              : tb
          )
        }));
      }
      return;
    }

    // Handle element label dragging
    if (draggingElementLabel !== null) {
      const label = labels.elementLabels[draggingElementLabel];
      if (label) {
        const element = elements[label.elementId];
        if (element) {
          let refPoint: Point;
          // Determine reference point based on element type
          if (element.type === 'point') {
            refPoint = element.points[0];
          } else if (element.type === 'line' || element.type === 'bezier') {
            refPoint = {
              x: (element.points[0].x + element.points[1].x) / 2,
              y: (element.points[0].y + element.points[1].y) / 2
            };
          } else {
            refPoint = element.points[Math.floor(element.points.length / 2)];
          }

          const canvasPoint = graphToCanvas(refPoint.x, refPoint.y);

          // Calculate new offset
          const newOffsetX = canvasX - canvasPoint.x;
          const newOffsetY = canvasY - canvasPoint.y;

          setLabels(prev => ({
            ...prev,
            elementLabels: prev.elementLabels.map((lbl, idx) =>
              idx === draggingElementLabel
                ? { ...lbl, offsetX: newOffsetX, offsetY: newOffsetY }
                : lbl
            )
          }));
        }
      }
      return;
    }

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
    // Reset panning state
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      justPannedRef.current = true;
      return;
    }

    // Handle text box drag/resize completion
    if (draggingTextBox || resizingTextBox) {
      setActionHistory(prev => [...prev, { type: 'label', previousState: labels }]);
      setRedoHistory([]);
      setDraggingTextBox(null);
      setResizingTextBox(null);

      // Notify parent component
      if (onLabelsChange) {
        onLabelsChange(labels);
      }
      return;
    }

    // Handle element label drag completion
    if (draggingElementLabel !== null) {
      if (labelsDragStartRef.current) {
        setActionHistory(prev => [...prev, { type: 'label', previousState: labelsDragStartRef.current! }]);
        setRedoHistory([]);
        labelsDragStartRef.current = null;
      }
      setDraggingElementLabel(null);

      // Notify parent component
      if (onLabelsChange) {
        onLabelsChange(labels);
      }
      return;
    }

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
      setRedoHistory([]);
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
        setRedoHistory([]);
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
    setRedoHistory([]);
  }, [strokeColor, strokeWidth]);

  const addFillArea = useCallback((elementId: number, fillAbove: boolean, color: string, fillToAxis: boolean = false) => {
    setFillAreas(prev => [...prev, { elementId, fillAbove, color, fillToAxis }]);
    setActionHistory(prev => [...prev, { type: 'fill' }]);
    setRedoHistory([]);
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
              setRedoHistory([]);
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
        setRedoHistory([]);
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
    setRedoHistory([]);
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

    if (actionHistory.length === 0) {
      return;
    }

    undoInProgressRef.current = true;

    const lastAction = actionHistory[actionHistory.length - 1];
    const newHistory = actionHistory.slice(0, -1);

    flushSync(() => {
      // Update action history first
      setActionHistory(newHistory);

      // Handle different action types
      if (lastAction.type === 'element') {
        const removedElement = elements[elements.length - 1];
        const newElements = elements.slice(0, -1);

        // Update elements
        setElements(newElements);

        // Clear selection if needed
        if (selectedElementId !== null && selectedElementId >= newElements.length) {
          setSelectedElementId(null);
        }

        // Add to redo history
        setRedoHistory(prev => [...prev, {
          type: 'element',
          removedElement
        } as Action & { removedElement: GraphElement }]);

      } else if (lastAction.type === 'fill') {
        const removedFill = fillAreas[fillAreas.length - 1];
        const newFills = fillAreas.slice(0, -1);

        // Update fills
        setFillAreas(newFills);

        // Add to redo history
        setRedoHistory(prev => [...prev, {
          type: 'fill',
          removedFill
        } as Action & { removedFill: FillArea }]);

      } else if (lastAction.type === 'modify') {
        if (lastAction.elementId < elements.length) {
          const currentState = { ...elements[lastAction.elementId] };
          const newElements = [...elements];
          newElements[lastAction.elementId] = { ...lastAction.previousState };

          // Update elements
          setElements(newElements);

          // Add to redo history
          setRedoHistory(prev => [...prev, {
            type: 'modify',
            elementId: lastAction.elementId,
            previousState: currentState
          }]);
        }
      } else if (lastAction.type === 'label') {
        const currentLabels = { ...labels };
        setLabels(lastAction.previousState);

        // Add to redo history
        setRedoHistory(prev => [...prev, {
          type: 'label',
          previousState: currentLabels
        }]);
      }
    });

    // Reset the flag
    undoInProgressRef.current = false;
  }, [actionHistory, elements, fillAreas, selectedElementId, labels]);

  const redo = useCallback(() => {
    if (redoHistory.length === 0) {
      return;
    }

    const lastRedoAction = redoHistory[redoHistory.length - 1];
    const newRedoHistory = redoHistory.slice(0, -1);

    flushSync(() => {
      // Update redo history first
      setRedoHistory(newRedoHistory);

      // Restore the undone action
      if (lastRedoAction.type === 'element') {
        const actionWithElement = lastRedoAction as Action & { removedElement: GraphElement };
        if (actionWithElement.removedElement) {
          setElements(prev => [...prev, actionWithElement.removedElement]);
          setActionHistory(prev => [...prev, { type: 'element' }]);
        }
      } else if (lastRedoAction.type === 'fill') {
        const actionWithFill = lastRedoAction as Action & { removedFill: FillArea };
        if (actionWithFill.removedFill) {
          setFillAreas(prev => [...prev, actionWithFill.removedFill]);
          setActionHistory(prev => [...prev, { type: 'fill' }]);
        }
      } else if (lastRedoAction.type === 'modify') {
        const modifyAction = lastRedoAction as Action & { elementId: number; previousState: GraphElement };
        if (modifyAction.elementId < elements.length) {
          const currentState = { ...elements[modifyAction.elementId] };
          const newElements = [...elements];
          newElements[modifyAction.elementId] = { ...modifyAction.previousState };

          setElements(newElements);
          setActionHistory(prev => [...prev, {
            type: 'modify',
            elementId: modifyAction.elementId,
            previousState: currentState
          }]);
        }
      } else if (lastRedoAction.type === 'label') {
        const labelAction = lastRedoAction as Action & { previousState: GraphLabels };
        const currentLabels = { ...labels };
        setLabels(labelAction.previousState);
        setActionHistory(prev => [...prev, {
          type: 'label',
          previousState: currentLabels
        }]);
      }
    });
  }, [redoHistory, elements, labels]);

  const togglePointProjection = useCallback((elementId: number) => {
    if (elementId < 0 || elementId >= elements.length) return;
    if (elements[elementId].type !== 'point') return;

    // Save the previous state for undo
    const previousElement = { ...elements[elementId] };

    setElements(prev => {
      const newElements = [...prev];
      newElements[elementId] = {
        ...newElements[elementId],
        showProjection: !newElements[elementId].showProjection
      };
      return newElements;
    });

    // Add this projection toggle as a discrete action in history
    setActionHistory(prev => [...prev, {
      type: 'modify',
      elementId: elementId,
      previousState: previousElement
    }]);
    setRedoHistory([]);
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
      panOffset: { ...panOffset },
      labels: { ...labels }
    };
  }, [elements, fillAreas, panOffset, labels]);

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
    setLabels(data.labels || DEFAULT_LABELS); // Backward compatibility

    // Rebuild action history for undo functionality
    const history: Action[] = [];
    data.elements.forEach(() => history.push({ type: 'element' }));
    data.fillAreas.forEach(() => history.push({ type: 'fill' }));
    setActionHistory(history);
    setRedoHistory([]);

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

  const updateSelectedElement = useCallback((color: string, lineWidth: number, addToHistory: boolean = false, previousState?: GraphElement) => {
    if (selectedElementId === null || selectedElementId >= elements.length) {
      return;
    }

    const currentElement = elements[selectedElementId];

    // Only update if something actually changed
    if (currentElement.color === color && currentElement.lineWidth === lineWidth) {
      return;
    }

    setElements(prev => {
      const newElements = [...prev];
      const element = { ...newElements[selectedElementId] };
      element.color = color;
      element.lineWidth = lineWidth;
      newElements[selectedElementId] = element;
      return newElements;
    });

    // Only add modification to action history if requested
    if (addToHistory) {
      const stateToSave = previousState || currentElement;
      setActionHistory(prev => [...prev, {
        type: 'modify',
        elementId: selectedElementId,
        previousState: stateToSave
      }]);
      setRedoHistory([]);
    }
  }, [selectedElementId, elements]);

  const addModifyAction = useCallback((elementId: number, previousState: GraphElement) => {
    setActionHistory(prev => [...prev, {
      type: 'modify',
      elementId,
      previousState
    }]);
    setRedoHistory([]);
  }, []);

  const getLabels = useCallback(() => {
    return labels;
  }, [labels]);

  const updateLabels = useCallback((newLabels: GraphLabels, addToHistory: boolean = false) => {
    if (addToHistory) {
      setActionHistory(prev => [...prev, {
        type: 'label',
        previousState: labels
      }]);
      setRedoHistory([]);
    }
    setLabels(newLabels);
  }, [labels]);

  const addTextBox = useCallback((textBox: TextBox) => {
    const previousLabels = { ...labels };
    const updatedLabels = {
      ...labels,
      textBoxes: [...labels.textBoxes, textBox]
    };
    setLabels(updatedLabels);
    setActionHistory(prev => [...prev, {
      type: 'label',
      previousState: previousLabels
    }]);
    setRedoHistory([]);

    // Notify parent component
    if (onLabelsChange) {
      onLabelsChange(updatedLabels);
    }
  }, [labels, onLabelsChange]);

  const deleteTextBox = useCallback((id: string) => {
    const previousLabels = { ...labels };
    const updatedLabels = {
      ...labels,
      textBoxes: labels.textBoxes.filter(tb => tb.id !== id)
    };
    setLabels(updatedLabels);
    setActionHistory(prev => [...prev, {
      type: 'label',
      previousState: previousLabels
    }]);
    setRedoHistory([]);

    // Notify parent component
    if (onLabelsChange) {
      onLabelsChange(updatedLabels);
    }
  }, [labels, onLabelsChange]);

  const selectTextBox = useCallback((id: string) => {
    setSelectedTextBoxId(id);
  }, []);

  // Expose methods via imperative handle
  useImperativeHandle(ref, () => ({
    addLineByCoordinates,
    addFillArea,
    addFunction,
    clearCanvas,
    undo,
    redo,
    getElements: () => elements,
    exportToPNG,
    getSelectedElement,
    getSelectedElementId,
    updateSelectedElement,
    addModifyAction,
    getExportData,
    importData,
    togglePointProjection,
    getLabels,
    updateLabels,
    addTextBox,
    deleteTextBox,
    selectTextBox
  }), [addLineByCoordinates, addFillArea, addFunction, clearCanvas, undo, redo, elements, exportToPNG, getSelectedElement, getSelectedElementId, updateSelectedElement, addModifyAction, getExportData, importData, togglePointProjection, getLabels, updateLabels, addTextBox, deleteTextBox, selectTextBox]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="touch-none rounded"
      style={{
        border: '2px solid var(--canvas-border)',
        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
        cursor: isPanning ? 'grabbing' : 'crosshair'
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
