'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { flushSync } from 'react-dom';
import { Parser } from 'expr-eval';

export type DrawMode = 'line' | 'bezier' | 'freehand' | 'fill' | 'select' | 'function' | 'point' | 'textbox';

export type Action =
  | { type: 'element' }
  | { type: 'fill' }
  | { type: 'modify'; elementId: number; previousState: GraphElement }
  | { type: 'label'; previousState: GraphLabels }
  | { type: 'paste'; previousElements: GraphElement[]; previousLabels: GraphLabels }
  | { type: 'delete'; deletedElements: {id: number, element: GraphElement}[]; deletedTextBoxes: TextBox[]; previousElementsLength: number }
  | { type: 'group'; previousGroups: Group[] }
  | { type: 'ungroup'; previousGroups: Group[] };

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
  lineStyle?: 'solid' | 'dashed' | 'dotted';  // Line style - default: 'solid'
  opacity?: number;  // Opacity 0-1 - default: 1
  arrowType?: 'none' | 'end' | 'start' | 'both';  // Arrow endpoints - default: 'none'
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

// Selection state for multi-object selection
export interface SelectionState {
  elementIds: Set<number>;
  textBoxIds: Set<string>;
}

// Group interface
export interface Group {
  id: string;           // UUID for the group
  memberIds: number[];  // Indices of elements in the elements array
}

// Clipboard data for copy/paste
export interface ClipboardData {
  elements: GraphElement[];
  textBoxes: TextBox[];
  timestamp: number;
  groupMemberships: Map<number, string>; // element index -> group ID
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
  groups: Group[];
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
    groups: Group[];
  };
  settings: {
    strokeColor: string;
    strokeWidth: number;
    drawMode: DrawMode;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    opacity: number;
  };
}

export interface GraphCanvasProps {
  width?: number;
  height?: number;
  showGrid: boolean;
  showAxisUnits?: boolean;
  strokeColor: string;
  strokeWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  opacity: number;
  arrowType: 'none' | 'end' | 'start' | 'both';
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
  addFunction: (formula: string, xMin: number, xMax: number, color: string, lineWidth: number, lineStyle?: 'solid' | 'dashed' | 'dotted', opacity?: number) => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  getElements: () => GraphElement[];
  exportToPNG: () => void;
  exportToJPEG: (quality?: number) => void;
  exportToPDF: (pageSize?: string, orientation?: 'portrait' | 'landscape') => void;
  getSelectedElement: () => GraphElement | null;
  getSelectedElementId: () => number | null;
  updateSelectedElement: (color: string, lineWidth: number, addToHistory?: boolean, previousState?: GraphElement, lineStyle?: 'solid' | 'dashed' | 'dotted', opacity?: number) => void;
  addModifyAction: (elementId: number, previousState: GraphElement) => void;
  getExportData: () => GraphExportData;
  importData: (data: GraphExportData) => void;
  togglePointProjection: (elementId: number) => void;
  getLabels: () => GraphLabels;
  updateLabels: (newLabels: GraphLabels, addToHistory?: boolean) => void;
  addTextBox: (textBox: TextBox) => void;
  deleteTextBox: (id: string) => void;
  selectTextBox: (id: string) => void;
  copySelection: () => void;
  pasteSelection: () => void;
  deleteSelection: () => void;
  getSelection: () => SelectionState;
  groupSelection: () => void;
  ungroupSelection: () => void;
  getGroups: () => Group[];
}

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvasComponent(props, ref) {
  const {
    width = 800,
    height = 600,
    showGrid,
    showAxisUnits = true,
    strokeColor,
    strokeWidth,
    lineStyle,
    opacity,
    arrowType,
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [actionHistory, setActionHistory] = useState<Action[]>([]);
  const [redoHistory, setRedoHistory] = useState<Action[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempControlPoint, setTempControlPoint] = useState<Point | null>(null);
  const [draggingControl, setDraggingControl] = useState(false);

  // Selection and editing state
  const [selection, setSelection] = useState<SelectionState>({
    elementIds: new Set(),
    textBoxIds: new Set()
  });
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const [draggingControlPointFlag, setDraggingControlPointFlag] = useState(false);
  const [draggingEntireElement, setDraggingEntireElement] = useState(false);
  const [elementDragStart, setElementDragStart] = useState<Point | null>(null);
  const selectedElementsOriginalStatesRef = useRef<Map<number, GraphElement> | null>(null);

  // Selection box for multi-select
  const [selectionBox, setSelectionBox] = useState<{start: Point, end: Point} | null>(null);
  const [isDrawingSelectionBox, setIsDrawingSelectionBox] = useState(false);
  const justFinishedSelectionBoxRef = useRef(false);

  // Clipboard for copy/paste
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

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

  // Helper function to check if an element is within selection box
  const isElementInSelectionBox = useCallback((element: GraphElement, box: {start: Point, end: Point}): boolean => {
    const minX = Math.min(box.start.x, box.end.x);
    const maxX = Math.max(box.start.x, box.end.x);
    const minY = Math.min(box.start.y, box.end.y);
    const maxY = Math.max(box.start.y, box.end.y);

    // Helper to check if a point is in the box
    const isPointInBox = (canvasX: number, canvasY: number): boolean => {
      return canvasX >= minX && canvasX <= maxX && canvasY >= minY && canvasY <= maxY;
    };

    // Helper to check if a line segment intersects with or is contained in the selection box
    const lineIntersectsBox = (x1: number, y1: number, x2: number, y2: number): boolean => {
      // If either endpoint is in the box, the line is selected
      if (isPointInBox(x1, y1) || isPointInBox(x2, y2)) return true;

      // If both endpoints are outside but on opposite sides of the box,
      // the line might pass through it - check edge intersections
      const boxEdges = [
        { x1: minX, y1: minY, x2: maxX, y2: minY }, // top
        { x1: maxX, y1: minY, x2: maxX, y2: maxY }, // right
        { x1: maxX, y1: maxY, x2: minX, y2: maxY }, // bottom
        { x1: minX, y1: maxY, x2: minX, y2: minY }  // left
      ];

      for (const edge of boxEdges) {
        if (lineSegmentsIntersect(x1, y1, x2, y2, edge.x1, edge.y1, edge.x2, edge.y2)) {
          return true;
        }
      }

      return false;
    };

    // Helper to check if two line segments intersect
    const lineSegmentsIntersect = (x1: number, y1: number, x2: number, y2: number,
                                    x3: number, y3: number, x4: number, y4: number): boolean => {
      const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
      if (denom === 0) return false; // parallel

      const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
      const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

      return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    };

    // For lines and bezier curves, check if the line segments intersect with the box
    if (element.type === 'line' && element.points.length === 2) {
      const p1 = graphToCanvas(element.points[0].x, element.points[0].y);
      const p2 = graphToCanvas(element.points[1].x, element.points[1].y);
      return lineIntersectsBox(p1.x, p1.y, p2.x, p2.y);
    }

    // For freehand, check if any segment intersects
    if (element.type === 'freehand') {
      for (let i = 0; i < element.points.length - 1; i++) {
        const p1 = graphToCanvas(element.points[i].x, element.points[i].y);
        const p2 = graphToCanvas(element.points[i + 1].x, element.points[i + 1].y);
        if (lineIntersectsBox(p1.x, p1.y, p2.x, p2.y)) {
          return true;
        }
      }
      return false;
    }

    // For bezier curves, check control points and sample points along the curve
    if (element.type === 'bezier' && element.points.length === 2 && element.controlPoint) {
      const p1 = graphToCanvas(element.points[0].x, element.points[0].y);
      const p2 = graphToCanvas(element.points[1].x, element.points[1].y);
      const cp = graphToCanvas(element.controlPoint.x, element.controlPoint.y);

      // Check control points
      if (isPointInBox(p1.x, p1.y) || isPointInBox(p2.x, p2.y) || isPointInBox(cp.x, cp.y)) {
        return true;
      }

      // Sample points along the bezier curve
      for (let t = 0; t <= 1; t += 0.1) {
        const x = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * cp.x + t * t * p2.x;
        const y = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * cp.y + t * t * p2.y;
        if (isPointInBox(x, y)) {
          return true;
        }
      }
      return false;
    }

    // For point elements or functions, check if any point is within the box
    return element.points.some(point => {
      const canvasPoint = graphToCanvas(point.x, point.y);
      return isPointInBox(canvasPoint.x, canvasPoint.y);
    });
  }, [graphToCanvas]);

  // Helper function to check if a textbox is within selection box
  const isTextBoxInSelectionBox = useCallback((textBox: TextBox, box: {start: Point, end: Point}): boolean => {
    const minX = Math.min(box.start.x, box.end.x);
    const maxX = Math.max(box.start.x, box.end.x);
    const minY = Math.min(box.start.y, box.end.y);
    const maxY = Math.max(box.start.y, box.end.y);

    let x = textBox.x;
    let y = textBox.y;
    if (textBox.coordinateSystem === 'graph') {
      const canvasPoint = graphToCanvas(textBox.x, textBox.y);
      x = canvasPoint.x;
      y = canvasPoint.y;
    }

    // Check if textbox intersects with selection box
    return !(x + textBox.width < minX || x > maxX ||
             y + textBox.height < minY || y > maxY);
  }, [graphToCanvas]);

  // Helper function to get all group members for an element
  const getGroupMembersForElement = useCallback((elementId: number): Set<number> => {
    const group = groups.find(g => g.memberIds.includes(elementId));
    return group ? new Set(group.memberIds) : new Set([elementId]);
  }, [groups]);

  // Find all objects within selection box
  const findObjectsInBox = useCallback((box: {start: Point, end: Point}): SelectionState => {
    const elementIds = new Set<number>();
    const textBoxIds = new Set<string>();

    elements.forEach((element, index) => {
      if (isElementInSelectionBox(element, box)) {
        elementIds.add(index);
      }
    });

    // Expand selection to include all group members
    const expandedElementIds = new Set<number>();
    elementIds.forEach(id => {
      const groupMembers = getGroupMembersForElement(id);
      groupMembers.forEach(memberId => expandedElementIds.add(memberId));
    });

    labels.textBoxes.forEach(textBox => {
      if (isTextBoxInSelectionBox(textBox, box)) {
        textBoxIds.add(textBox.id);
      }
    });

    return { elementIds: expandedElementIds, textBoxIds };
  }, [elements, labels.textBoxes, isElementInSelectionBox, isTextBoxInSelectionBox, getGroupMembersForElement]);

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
      if (selection.textBoxIds.has(textBox.id)) {
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

      // Resize handles if selected (only show for single selection)
      if (selection.textBoxIds.has(textBox.id) && selection.textBoxIds.size === 1 && selection.elementIds.size === 0) {
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
  }, [labels, elements, graphToCanvas, selection, wrapText, getTitleOffset, panOffset, selectedElementLabelIndex]);

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

  // Helper function to apply line style and opacity
  const applyLineStyle = useCallback((
    ctx: CanvasRenderingContext2D,
    style: 'solid' | 'dashed' | 'dotted' = 'solid',
    elementOpacity: number = 1
  ) => {
    // Apply opacity
    ctx.globalAlpha = elementOpacity;

    // Apply line dash pattern
    switch (style) {
      case 'dashed':
        ctx.setLineDash([10, 5]);  // 10px dash, 5px gap
        break;
      case 'dotted':
        ctx.setLineDash([2, 3]);   // 2px dot, 3px gap
        break;
      case 'solid':
      default:
        ctx.setLineDash([]);
        break;
    }
  }, []);

  // Draw arrow at end of line
  const drawArrow = useCallback((
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    arrowSize: number,
    color: string,
    opacity: number
  ) => {
    // Calculate arrow direction angle
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;

    // Translate to arrow tip
    ctx.translate(toX, toY);
    ctx.rotate(angle);

    // Draw filled triangle
    ctx.beginPath();
    ctx.moveTo(0, 0);                          // Arrow tip
    ctx.lineTo(-arrowSize * 1.5, arrowSize);   // Bottom
    ctx.lineTo(-arrowSize * 1.5, -arrowSize);  // Top
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, []);

  // Draw arrow at start of line
  const drawArrowAtStart = useCallback((
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    arrowSize: number,
    color: string,
    opacity: number
  ) => {
    // Calculate arrow direction angle (reversed)
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;

    // Translate to start point and rotate 180 degrees
    ctx.translate(fromX, fromY);
    ctx.rotate(angle + Math.PI);

    // Draw filled triangle
    ctx.beginPath();
    ctx.moveTo(0, 0);                          // Arrow tip
    ctx.lineTo(-arrowSize * 1.5, arrowSize);   // Bottom
    ctx.lineTo(-arrowSize * 1.5, -arrowSize);  // Top
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, []);

  // Draw a line element
  const drawLine = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    if (element.points.length < 2) return;

    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Apply line style and opacity
    applyLineStyle(ctx, element.lineStyle, element.opacity);

    const start = graphToCanvas(element.points[0].x, element.points[0].y);
    const end = graphToCanvas(element.points[1].x, element.points[1].y);

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Draw arrows if configured
    const arrowType = element.arrowType || 'none';
    const arrowSize = Math.max(3, Math.min(20, element.lineWidth * 0.75));

    if (arrowType === 'end' || arrowType === 'both') {
      drawArrow(ctx, start.x, start.y, end.x, end.y, arrowSize, element.color, element.opacity ?? 1);
    }
    if (arrowType === 'start' || arrowType === 'both') {
      drawArrowAtStart(ctx, start.x, start.y, end.x, end.y, arrowSize, element.color, element.opacity ?? 1);
    }

    // Reset to defaults
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }, [graphToCanvas, applyLineStyle, drawArrow, drawArrowAtStart]);

  // Draw a bezier curve element
  const drawBezier = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    if (element.points.length < 2 || !element.controlPoint) return;

    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Apply line style and opacity
    applyLineStyle(ctx, element.lineStyle, element.opacity);

    const start = graphToCanvas(element.points[0].x, element.points[0].y);
    const end = graphToCanvas(element.points[1].x, element.points[1].y);
    const control = graphToCanvas(element.controlPoint.x, element.controlPoint.y);

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
    ctx.stroke();

    // Draw arrows if configured
    const arrowType = element.arrowType || 'none';
    const arrowSize = Math.max(3, Math.min(20, element.lineWidth * 0.75));

    if (arrowType === 'end' || arrowType === 'both') {
      // Arrow at end: use tangent from control point to end point
      drawArrow(ctx, control.x, control.y, end.x, end.y, arrowSize, element.color, element.opacity ?? 1);
    }
    if (arrowType === 'start' || arrowType === 'both') {
      // Arrow at start: use tangent from start point to control point
      drawArrowAtStart(ctx, start.x, start.y, control.x, control.y, arrowSize, element.color, element.opacity ?? 1);
    }

    // Reset to defaults
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }, [graphToCanvas, applyLineStyle, drawArrow, drawArrowAtStart]);

  // Draw a point element
  const drawPoint = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    if (element.points.length < 1) return;

    const point = element.points[0];
    const canvasPoint = graphToCanvas(point.x, point.y);
    const pointSize = element.pointSize || element.lineWidth * 2;

    // Apply opacity to point
    ctx.globalAlpha = element.opacity ?? 1;

    // Draw the point
    ctx.fillStyle = element.color;
    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, pointSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw projection lines to axes if enabled
    if (element.showProjection) {
      // Apply slightly more transparency to projections
      ctx.globalAlpha = (element.opacity ?? 1) * 0.8;
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

    // Reset opacity
    ctx.globalAlpha = 1;
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

    // Apply line style and opacity
    applyLineStyle(ctx, element.lineStyle, element.opacity);

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
      // Reset to defaults
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
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

    // Draw arrows if configured
    const arrowType = element.arrowType || 'none';
    const arrowSize = Math.max(3, Math.min(20, element.lineWidth * 0.75));

    if (canvasPoints.length >= 2) {
      if (arrowType === 'end' || arrowType === 'both') {
        // Arrow at end: use direction from second-to-last to last point
        const secondLast = canvasPoints[canvasPoints.length - 2];
        const last = canvasPoints[canvasPoints.length - 1];
        drawArrow(ctx, secondLast.x, secondLast.y, last.x, last.y, arrowSize, element.color, element.opacity ?? 1);
      }
      if (arrowType === 'start' || arrowType === 'both') {
        // Arrow at start: use direction from first to second point
        const first = canvasPoints[0];
        const second = canvasPoints[1];
        drawArrowAtStart(ctx, first.x, first.y, second.x, second.y, arrowSize, element.color, element.opacity ?? 1);
      }
    }

    // Reset to defaults
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }, [graphToCanvas, simplifyPoints, applyLineStyle, drawArrow, drawArrowAtStart]);

  // Draw a function curve
  const drawFunction = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    if (element.points.length < 2) return;

    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Apply line style and opacity
    applyLineStyle(ctx, element.lineStyle, element.opacity);

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

    // Reset to defaults
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }, [graphToCanvas, applyLineStyle]);

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
    // Multiply fill opacity (0.3) with element opacity
    const elementOpacity = element.opacity ?? 1;
    ctx.globalAlpha = 0.3 * elementOpacity;

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

    // Draw selection highlights for all selected elements
    selection.elementIds.forEach(selectedElementId => {
      if (selectedElementId < elements.length) {
        const selectedElement = elements[selectedElementId];

        // Draw control points for selected element
        if (selectedElement.type === 'line') {
          // Draw start and end points with glow effect
          selectedElement.points.forEach((point, idx) => {
            const canvasPoint = graphToCanvas(point.x, point.y);

            // Outer glow
            ctx.fillStyle = 'rgba(230, 126, 34, 0.3)';
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 14, 0, Math.PI * 2);
            ctx.fill();

            // Main circle
            ctx.fillStyle = '#E67E22';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
        } else if (selectedElement.type === 'bezier') {
          // Draw start and end points with glow effect
          selectedElement.points.forEach((point, idx) => {
            const canvasPoint = graphToCanvas(point.x, point.y);

            // Outer glow
            ctx.fillStyle = 'rgba(230, 126, 34, 0.3)';
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 14, 0, Math.PI * 2);
            ctx.fill();

            // Main circle
            ctx.fillStyle = '#E67E22';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });

          // Draw control point
          if (selectedElement.controlPoint) {
            const controlCanvas = graphToCanvas(selectedElement.controlPoint.x, selectedElement.controlPoint.y);
            ctx.globalAlpha = 1; // Don't apply element opacity to helper lines
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
          // Draw a glow around first and last points
          [0, selectedElement.points.length - 1].forEach(idx => {
            if (idx < selectedElement.points.length) {
              const point = selectedElement.points[idx];
              const canvasPoint = graphToCanvas(point.x, point.y);

              // Outer glow
              ctx.fillStyle = 'rgba(230, 126, 34, 0.3)';
              ctx.beginPath();
              ctx.arc(canvasPoint.x, canvasPoint.y, 12, 0, Math.PI * 2);
              ctx.fill();

              // Main circle
              ctx.fillStyle = '#E67E22';
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(canvasPoint.x, canvasPoint.y, 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
          });
        } else if (selectedElement.type === 'function') {
          // Draw a glow around first and last points
          if (selectedElement.points && selectedElement.points.length > 0) {
            [0, selectedElement.points.length - 1].forEach(idx => {
              if (idx < selectedElement.points.length) {
                const point = selectedElement.points[idx];
                const canvasPoint = graphToCanvas(point.x, point.y);

                // Outer glow
                ctx.fillStyle = 'rgba(230, 126, 34, 0.3)';
                ctx.beginPath();
                ctx.arc(canvasPoint.x, canvasPoint.y, 12, 0, Math.PI * 2);
                ctx.fill();

                // Main circle
                ctx.fillStyle = '#E67E22';
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(canvasPoint.x, canvasPoint.y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              }
            });
          }
        } else if (selectedElement.type === 'point') {
          // Draw selection glow around point
          const point = selectedElement.points[0];
          const canvasPoint = graphToCanvas(point.x, point.y);
          const pointSize = selectedElement.pointSize || selectedElement.lineWidth * 2;

          // Outer glow
          ctx.fillStyle = 'rgba(230, 126, 34, 0.3)';
          ctx.beginPath();
          ctx.arc(canvasPoint.x, canvasPoint.y, pointSize + 10, 0, Math.PI * 2);
          ctx.fill();

          // Draw outer selection ring
          ctx.strokeStyle = '#E67E22';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(canvasPoint.x, canvasPoint.y, pointSize + 6, 0, Math.PI * 2);
          ctx.stroke();

          // Draw inner white ring
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(canvasPoint.x, canvasPoint.y, pointSize + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });

    // Draw selection box if active
    if (isDrawingSelectionBox && selectionBox) {
      const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
      const maxX = Math.max(selectionBox.start.x, selectionBox.end.x);
      const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
      const maxY = Math.max(selectionBox.start.y, selectionBox.end.y);

      // Draw dashed border
      ctx.strokeStyle = '#2B5F82';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);

      // Draw semi-transparent fill
      ctx.fillStyle = 'rgba(43, 95, 130, 0.1)';
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    }

    // Draw group bounding boxes for selected groups
    groups.forEach(group => {
      // Check if any group member is selected
      const hasSelectedMember = group.memberIds.some(id => selection.elementIds.has(id));
      if (!hasSelectedMember) return;

      // Calculate bounding box of all member points (including control points)
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      group.memberIds.forEach(id => {
        if (id >= elements.length) return;
        const element = elements[id];

        // Include all points
        element.points.forEach(point => {
          const canvasPoint = graphToCanvas(point.x, point.y);
          minX = Math.min(minX, canvasPoint.x);
          minY = Math.min(minY, canvasPoint.y);
          maxX = Math.max(maxX, canvasPoint.x);
          maxY = Math.max(maxY, canvasPoint.y);
        });

        // Include control point for bezier curves
        if (element.controlPoint) {
          const canvasPoint = graphToCanvas(element.controlPoint.x, element.controlPoint.y);
          minX = Math.min(minX, canvasPoint.x);
          minY = Math.min(minY, canvasPoint.y);
          maxX = Math.max(maxX, canvasPoint.x);
          maxY = Math.max(maxY, canvasPoint.y);
        }
      });

      // Add padding
      const padding = 10;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      // Draw light gray dotted bounding box
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);
    });
  }, [drawGrid, elements, fillAreas, currentPoints, tempControlPoint, isDrawing, drawMode, strokeColor, strokeWidth, graphToCanvas, drawLine, drawBezier, drawFreehand, drawPoint, drawFunction, fillAreaForElement, selection, selectionBox, isDrawingSelectionBox, simplifyPoints, renderLabels, groups]);

  // Re-render when dependencies change
  useEffect(() => {
    render();
  }, [render]);

  // Clear selection when switching away from select/textbox modes
  useEffect(() => {
    if (drawMode !== 'select' && drawMode !== 'textbox') {
      setSelection({ elementIds: new Set(), textBoxIds: new Set() });
    }
  }, [drawMode]);

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
      // Emit first selected element ID for backward compatibility
      const firstElementId = Array.from(selection.elementIds)[0];
      onSelectionChange(firstElementId !== undefined ? firstElementId : null);
    }
  }, [selection, elements, onSelectionChange]);

  // Notify parent when elements array changes
  useEffect(() => {
    if (onElementsChange) {
      onElementsChange(elements.length);
    }
  }, [elements, onElementsChange]);

  // Note: Selection clearing when switching modes is handled by the useEffect at line ~1431

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

    // Ignore clicks if we just finished drawing a selection box
    if (justFinishedSelectionBoxRef.current) {
      justFinishedSelectionBoxRef.current = false;
      return;
    }

    const point = getEventPoint(e);

    if (drawMode === 'select') {
      // Selection mode: find and select element
      const { x: canvasX, y: canvasY } = getCanvasCoordinates(e);
      const isCtrlPressed = ('ctrlKey' in e && e.ctrlKey) || ('metaKey' in e && e.metaKey);

      const clickedElementId = findClickedElement(canvasX, canvasY);
      const clickedTextBoxId = findClickedTextBox(canvasX, canvasY);

      if (isCtrlPressed) {
        // Toggle mode - add/remove from selection
        if (clickedElementId !== null) {
          setSelection(prev => {
            const groupMembers = getGroupMembersForElement(clickedElementId);
            const newElementIds = new Set(prev.elementIds);

            // Check if all group members are already selected
            const allMembersSelected = Array.from(groupMembers).every(id => newElementIds.has(id));

            if (allMembersSelected) {
              // Remove all group members from selection
              groupMembers.forEach(id => newElementIds.delete(id));
            } else {
              // Add all group members to selection
              groupMembers.forEach(id => newElementIds.add(id));
            }
            return { ...prev, elementIds: newElementIds };
          });
        } else if (clickedTextBoxId !== null) {
          setSelection(prev => {
            const newTextBoxIds = new Set(prev.textBoxIds);
            if (newTextBoxIds.has(clickedTextBoxId)) {
              newTextBoxIds.delete(clickedTextBoxId);
            } else {
              newTextBoxIds.add(clickedTextBoxId);
            }
            return { ...prev, textBoxIds: newTextBoxIds };
          });
        }
      } else {
        // Replace selection
        if (clickedElementId !== null) {
          const groupMembers = getGroupMembersForElement(clickedElementId);
          setSelection({
            elementIds: groupMembers,
            textBoxIds: new Set()
          });
        } else if (clickedTextBoxId !== null) {
          setSelection({
            elementIds: new Set(),
            textBoxIds: new Set([clickedTextBoxId])
          });
        } else {
          // Clear selection on empty area click
          setSelection({ elementIds: new Set(), textBoxIds: new Set() });
        }
      }
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
          lineWidth: strokeWidth,
          lineStyle: lineStyle,
          opacity: opacity,
          arrowType: arrowType
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
        showProjection: false,
        lineStyle: lineStyle,
        opacity: opacity
      };
      const newElementId = elements.length;
      setElements(prev => [...prev, newElement]);
      setActionHistory(prev => [...prev, { type: 'element' }]);
      setRedoHistory([]);
      // Auto-select the newly created point
      setSelection({
        elementIds: new Set([newElementId]),
        textBoxIds: new Set()
      });
    }

    onCoordinateClick?.(point);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x: canvasX, y: canvasY } = getCanvasCoordinates(e);

    // Check if CTRL key is pressed
    const isCtrlPressed = 'ctrlKey' in e && e.ctrlKey;

    if (isCtrlPressed) {
      // If elements are selected, start multi-element translation instead of panning
      if (selection.elementIds.size > 0) {
        // Store original states for all selected elements for undo
        const originalStates = new Map<number, GraphElement>();
        selection.elementIds.forEach(elementId => {
          if (elementId < elements.length) {
            // Deep copy the element including all points and control point
            const element = elements[elementId];
            originalStates.set(elementId, {
              ...element,
              points: element.points.map(p => ({ ...p })),
              controlPoint: element.controlPoint ? { ...element.controlPoint } : undefined
            });
          }
        });

        selectedElementsOriginalStatesRef.current = originalStates;
        setDraggingEntireElement(true);
        setElementDragStart({ x: canvasX, y: canvasY });
        return;
      }

      // Otherwise, start panning
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

          setSelection({ elementIds: new Set(), textBoxIds: new Set([clickedTextBoxId]) });
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
        if (selection.textBoxIds.size > 0) {
          // If a text box is already selected, deselect it
          setSelection({ elementIds: new Set(), textBoxIds: new Set() });
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
          setSelection({ elementIds: new Set(), textBoxIds: new Set([newTextBox.id]) });

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
            setSelection({ elementIds: new Set(), textBoxIds: new Set([clickedTextBoxId]) });
            return;
          }

          setSelection({ elementIds: new Set(), textBoxIds: new Set([clickedTextBoxId]) });
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

    const firstElementId = Array.from(selection.elementIds)[0];
    if (drawMode === 'select' && firstElementId !== undefined) {
      // Check if clicking on a control point of selected element
      const clickedPoint = findClickedPoint(canvasX, canvasY, firstElementId);
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

    // Start selection box in select mode if clicking on empty area (without Ctrl)
    if (drawMode === 'select' && !isCtrlPressed) {
      const clickedElementId = findClickedElement(canvasX, canvasY);
      const clickedTextBoxId = findClickedTextBox(canvasX, canvasY);

      if (clickedElementId === null && clickedTextBoxId === null) {
        // No object clicked, start selection box
        setIsDrawingSelectionBox(true);
        setSelectionBox({
          start: { x: canvasX, y: canvasY },
          end: { x: canvasX, y: canvasY }
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x: canvasX, y: canvasY } = getCanvasCoordinates(e);
    const firstElementId = Array.from(selection.elementIds)[0];

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

    // Handle selection box dragging
    if (isDrawingSelectionBox && selectionBox) {
      setSelectionBox({
        ...selectionBox,
        end: { x: canvasX, y: canvasY }
      });
      return;
    }

    // Handle entire element translation (translate all selected elements)
    if (draggingEntireElement && elementDragStart) {
      // Defensive null check for the ref
      if (!selectedElementsOriginalStatesRef.current) {
        return;
      }

      // Calculate total delta from initial drag start position
      const deltaX = canvasX - elementDragStart.x;
      const deltaY = canvasY - elementDragStart.y;

      // Convert canvas delta to graph delta
      const deltaGraphX = deltaX / scale.x;
      const deltaGraphY = -deltaY / scale.y; // Negative because canvas Y is inverted

      setElements(prev => {
        const newElements = [...prev];

        // Translate all selected elements
        selectedElementsOriginalStatesRef.current!.forEach((originalElement, elementId) => {
          const element = { ...newElements[elementId] };

          // Translate all points based on original positions + total delta
          element.points = originalElement.points.map(p => ({
            x: p.x + deltaGraphX,
            y: p.y + deltaGraphY
          }));

          // Translate control point if it's a bezier
          if (element.type === 'bezier' && originalElement.controlPoint) {
            element.controlPoint = {
              x: originalElement.controlPoint.x + deltaGraphX,
              y: originalElement.controlPoint.y + deltaGraphY
            };
          }

          newElements[elementId] = element;
        });

        return newElements;
      });

      // Don't update elementDragStart - keep it at the initial position
      // This ensures delta is always calculated from the original drag start point
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

    if (drawMode === 'select' && firstElementId !== undefined) {
      // Dragging a control point
      if (draggingPointIndex !== null) {
        setElements(prev => {
          const newElements = [...prev];
          const element = { ...newElements[firstElementId] };
          element.points = [...element.points];
          element.points[draggingPointIndex] = point;
          newElements[firstElementId] = element;
          return newElements;
        });
      } else if (draggingControlPointFlag) {
        // Dragging bezier control point
        setElements(prev => {
          const newElements = [...prev];
          const element = { ...newElements[firstElementId] };
          if (element.type === 'bezier') {
            element.controlPoint = point;
          }
          newElements[firstElementId] = element;
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
    // Handle entire element translation completion (for all selected elements)
    if (draggingEntireElement && selectedElementsOriginalStatesRef.current) {
      // Create modify actions for all translated elements
      const modifyActions: Action[] = [];
      selectedElementsOriginalStatesRef.current.forEach((originalState, elementId) => {
        modifyActions.push({
          type: 'modify',
          elementId: elementId,
          previousState: originalState
        });
      });

      // Add all modify actions to history
      setActionHistory(prev => [...prev, ...modifyActions]);
      setRedoHistory([]);

      setDraggingEntireElement(false);
      setElementDragStart(null);
      selectedElementsOriginalStatesRef.current = null;
      return;
    }

    // Finalize selection box
    if (isDrawingSelectionBox && selectionBox) {
      const selectedObjects = findObjectsInBox(selectionBox);
      setSelection(selectedObjects);
      setIsDrawingSelectionBox(false);
      setSelectionBox(null);

      // Set flag to prevent onClick from clearing the selection
      justFinishedSelectionBoxRef.current = true;

      return;
    }

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
        lineWidth: strokeWidth,
        lineStyle: lineStyle,
        opacity: opacity,
        arrowType: arrowType
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
          lineWidth: strokeWidth,
          lineStyle: lineStyle,
          opacity: opacity,
          arrowType: arrowType
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
      lineWidth: strokeWidth,
      lineStyle: lineStyle,
      opacity: opacity,
      arrowType: arrowType
    };
    setElements(prev => [...prev, newElement]);
    setActionHistory(prev => [...prev, { type: 'element' }]);
    setRedoHistory([]);
  }, [strokeColor, strokeWidth, lineStyle, opacity, arrowType]);

  const addFillArea = useCallback((elementId: number, fillAbove: boolean, color: string, fillToAxis: boolean = false) => {
    setFillAreas(prev => [...prev, { elementId, fillAbove, color, fillToAxis }]);
    setActionHistory(prev => [...prev, { type: 'fill' }]);
    setRedoHistory([]);
  }, []);

  const addFunction = useCallback((formula: string, xMin: number, xMax: number, color: string, lineWidth: number, lineStyleParam?: 'solid' | 'dashed' | 'dotted', opacityParam?: number) => {
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
                xMax,
                lineStyle: lineStyleParam ?? 'solid',
                opacity: opacityParam ?? 1
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
          xMax,
          lineStyle: lineStyleParam ?? 'solid',
          opacity: opacityParam ?? 1
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
    setSelection({ elementIds: new Set(), textBoxIds: new Set() });
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

        // Clear selection if any selected element index is invalid
        const invalidSelection = Array.from(selection.elementIds).some(id => id >= newElements.length);
        if (invalidSelection) {
          setSelection({ elementIds: new Set(), textBoxIds: selection.textBoxIds });
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
      } else if (lastAction.type === 'paste') {
        // Undo paste: restore previous state
        const currentElements = [...elements];
        const currentLabels = { ...labels };

        setElements(lastAction.previousElements);
        setLabels(lastAction.previousLabels);

        // Add to redo history
        setRedoHistory(prev => [...prev, {
          type: 'paste',
          previousElements: currentElements,
          previousLabels: currentLabels
        }]);
      } else if (lastAction.type === 'delete') {
        // Undo delete: restore deleted objects
        const newElements = [...elements];

        // Restore elements at their original indices
        lastAction.deletedElements.forEach(({ id, element }) => {
          newElements.splice(id, 0, element);
        });

        const newLabels = {
          ...labels,
          textBoxes: [...labels.textBoxes, ...lastAction.deletedTextBoxes]
        };

        setElements(newElements);
        setLabels(newLabels);

        // Add to redo history
        setRedoHistory(prev => [...prev, {
          type: 'delete',
          deletedElements: lastAction.deletedElements,
          deletedTextBoxes: lastAction.deletedTextBoxes,
          previousElementsLength: lastAction.previousElementsLength
        }]);
      } else if (lastAction.type === 'group') {
        // Undo group: restore previous groups state
        const currentGroups = [...groups];
        setGroups(lastAction.previousGroups);

        // Add to redo history
        setRedoHistory(prev => [...prev, {
          type: 'group',
          previousGroups: currentGroups
        }]);
      } else if (lastAction.type === 'ungroup') {
        // Undo ungroup: restore previous groups state
        const currentGroups = [...groups];
        setGroups(lastAction.previousGroups);

        // Add to redo history
        setRedoHistory(prev => [...prev, {
          type: 'ungroup',
          previousGroups: currentGroups
        }]);
      }
    });

    // Reset the flag
    undoInProgressRef.current = false;
  }, [actionHistory, elements, fillAreas, selection, labels, groups]);

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
      } else if (lastRedoAction.type === 'paste') {
        // Redo paste
        const pasteAction = lastRedoAction as Action & { previousElements: GraphElement[]; previousLabels: GraphLabels };
        const currentElements = [...elements];
        const currentLabels = { ...labels };

        setElements(pasteAction.previousElements);
        setLabels(pasteAction.previousLabels);

        setActionHistory(prev => [...prev, {
          type: 'paste',
          previousElements: currentElements,
          previousLabels: currentLabels
        }]);
      } else if (lastRedoAction.type === 'delete') {
        // Redo delete
        const deleteAction = lastRedoAction as Action & { deletedElements: {id: number, element: GraphElement}[]; deletedTextBoxes: TextBox[]; previousElementsLength: number };

        const newElements = [...elements];
        deleteAction.deletedElements.forEach(({ id }) => {
          newElements.splice(id, 1);
        });

        const newTextBoxes = labels.textBoxes.filter(
          tb => !deleteAction.deletedTextBoxes.find(dtb => dtb.id === tb.id)
        );

        setElements(newElements);
        setLabels(prev => ({ ...prev, textBoxes: newTextBoxes }));

        setActionHistory(prev => [...prev, {
          type: 'delete',
          deletedElements: deleteAction.deletedElements,
          deletedTextBoxes: deleteAction.deletedTextBoxes,
          previousElementsLength: deleteAction.previousElementsLength
        }]);
      } else if (lastRedoAction.type === 'group') {
        // Redo group
        const groupAction = lastRedoAction as Action & { previousGroups: Group[] };
        const currentGroups = [...groups];
        setGroups(groupAction.previousGroups);

        setActionHistory(prev => [...prev, {
          type: 'group',
          previousGroups: currentGroups
        }]);
      } else if (lastRedoAction.type === 'ungroup') {
        // Redo ungroup
        const ungroupAction = lastRedoAction as Action & { previousGroups: Group[] };
        const currentGroups = [...groups];
        setGroups(ungroupAction.previousGroups);

        setActionHistory(prev => [...prev, {
          type: 'ungroup',
          previousGroups: currentGroups
        }]);
      }
    });
  }, [redoHistory, elements, labels, groups]);

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

  // Group selected objects
  const handleGroup = useCallback(() => {
    // Check: need at least 2 elements
    if (selection.elementIds.size < 2) {
      return;
    }

    // Check: no selected elements are already in a group (flat groups only)
    const selectedIds = Array.from(selection.elementIds);
    const isAnyInGroup = selectedIds.some(id =>
      groups.some(g => g.memberIds.includes(id))
    );

    if (isAnyInGroup) {
      return; // Can't group elements that are already in a group
    }

    // Create new group
    const newGroup: Group = {
      id: crypto.randomUUID(),
      memberIds: selectedIds.sort((a, b) => a - b) // Sort for consistency
    };

    // Use flushSync to ensure state updates happen synchronously
    flushSync(() => {
      // Add to groups array
      setGroups(prev => [...prev, newGroup]);

      // Add to action history for undo
      setActionHistory(prev => [...prev, {
        type: 'group',
        previousGroups: groups
      }]);
      setRedoHistory([]);
    });
  }, [selection.elementIds, groups]);

  // Ungroup selected objects
  const handleUngroup = useCallback(() => {
    if (selection.elementIds.size === 0) {
      return;
    }

    // Find groups containing any selected elements
    const selectedIds = Array.from(selection.elementIds);
    const groupsToRemove = groups.filter(g =>
      g.memberIds.some(id => selectedIds.includes(id))
    );

    if (groupsToRemove.length === 0) {
      return; // No groups to ungroup
    }

    // Remove those groups from groups array
    const newGroups = groups.filter(g =>
      !groupsToRemove.some(gr => gr.id === g.id)
    );

    // Use flushSync to ensure state updates happen synchronously
    flushSync(() => {
      setGroups(newGroups);

      // Add to action history for undo
      setActionHistory(prev => [...prev, {
        type: 'ungroup',
        previousGroups: groups
      }]);
      setRedoHistory([]);
    });
  }, [selection.elementIds, groups]);

  // Copy selected objects to clipboard
  const handleCopy = useCallback(() => {
    if (selection.elementIds.size === 0 && selection.textBoxIds.size === 0) {
      return; // Nothing to copy
    }

    // Gather selected elements
    const selectedElements = Array.from(selection.elementIds)
      .map(id => elements[id])
      .filter(Boolean);

    const selectedTextBoxes = Array.from(selection.textBoxIds)
      .map(id => labels.textBoxes.find(tb => tb.id === id))
      .filter(Boolean) as TextBox[];

    // Create groupMemberships map
    const groupMemberships = new Map<number, string>();
    Array.from(selection.elementIds).forEach(id => {
      const group = groups.find(g => g.memberIds.includes(id));
      if (group) {
        groupMemberships.set(id, group.id);
      }
    });

    const clipboardData: ClipboardData = {
      elements: selectedElements.map(el => ({ ...el, points: el.points.map(p => ({ ...p })), controlPoint: el.controlPoint ? { ...el.controlPoint } : undefined })),
      textBoxes: selectedTextBoxes.map(tb => ({ ...tb })),
      timestamp: Date.now(),
      groupMemberships
    };

    setClipboard(clipboardData);

    // Also copy to system clipboard as JSON
    try {
      // Convert Map to object for JSON serialization
      const serializable = {
        ...clipboardData,
        groupMemberships: Object.fromEntries(groupMemberships)
      };
      navigator.clipboard.writeText(JSON.stringify(serializable, null, 2))
        .catch(err => console.warn('Failed to copy to system clipboard:', err));
    } catch (err) {
      console.warn('Failed to copy to system clipboard:', err);
    }
  }, [selection, elements, labels.textBoxes, groups]);

  // Paste objects from clipboard
  const handlePaste = useCallback(() => {
    if (!clipboard) return;

    const PASTE_OFFSET = { x: 0.5, y: -0.5 }; // Graph units
    const CANVAS_OFFSET = { x: 20, y: 20 }; // Pixels

    // Create action for undo
    const previousElements = [...elements];
    const previousLabels = { ...labels };

    // Paste elements with offset
    const pastedElements = clipboard.elements.map(el => ({
      ...el,
      points: el.points.map(p => ({
        x: p.x + PASTE_OFFSET.x,
        y: p.y + PASTE_OFFSET.y
      })),
      controlPoint: el.controlPoint ? {
        x: el.controlPoint.x + PASTE_OFFSET.x,
        y: el.controlPoint.y + PASTE_OFFSET.y
      } : undefined
    }));

    const newElementStartIndex = elements.length;
    setElements(prev => [...prev, ...pastedElements]);

    // Paste textboxes with offset (canvas coordinates)
    const pastedTextBoxes = clipboard.textBoxes.map(tb => ({
      ...tb,
      id: crypto.randomUUID(), // New UUID
      x: tb.x + CANVAS_OFFSET.x,
      y: tb.y + CANVAS_OFFSET.y
    }));

    setLabels(prev => ({
      ...prev,
      textBoxes: [...prev.textBoxes, ...pastedTextBoxes]
    }));

    // Select pasted objects
    const newElementIds = new Set(
      Array.from({ length: pastedElements.length }, (_, i) => newElementStartIndex + i)
    );
    const newTextBoxIds = new Set(pastedTextBoxes.map(tb => tb.id));

    setSelection({ elementIds: newElementIds, textBoxIds: newTextBoxIds });

    // Recreate groups for pasted elements
    if (clipboard.groupMemberships && clipboard.groupMemberships.size > 0) {
      // Create oldToNewIndexMap: the old index in clipboard to new index in elements array
      const copiedElementIds = Array.from(clipboard.groupMemberships.keys()).sort((a, b) => a - b);
      const oldToNewIndexMap = new Map<number, number>();
      copiedElementIds.forEach((oldId, idx) => {
        oldToNewIndexMap.set(oldId, newElementStartIndex + idx);
      });

      // Group elements by their group IDs
      const groupIdToMembers = new Map<string, number[]>();
      clipboard.groupMemberships.forEach((groupId, oldIndex) => {
        const newIndex = oldToNewIndexMap.get(oldIndex);
        if (newIndex !== undefined) {
          if (!groupIdToMembers.has(groupId)) {
            groupIdToMembers.set(groupId, []);
          }
          groupIdToMembers.get(groupId)!.push(newIndex);
        }
      });

      // Create new groups with new member IDs
      const newGroups: Group[] = [];
      groupIdToMembers.forEach((memberIds) => {
        if (memberIds.length >= 2) {
          newGroups.push({
            id: crypto.randomUUID(),
            memberIds: memberIds.sort((a, b) => a - b)
          });
        }
      });

      // Add new groups to groups array
      setGroups(prev => [...prev, ...newGroups]);
    }

    // Add to history
    setActionHistory(prev => [...prev, {
      type: 'paste',
      previousElements,
      previousLabels
    }]);
    setRedoHistory([]);

    // Notify parent components
    if (onElementsChange) {
      onElementsChange(elements.length + pastedElements.length);
    }
    if (onLabelsChange && pastedTextBoxes.length > 0) {
      onLabelsChange({ ...labels, textBoxes: [...labels.textBoxes, ...pastedTextBoxes] });
    }
  }, [clipboard, elements, labels, onElementsChange, onLabelsChange]);

  // Delete selected objects
  const handleDelete = useCallback(() => {
    if (selection.elementIds.size === 0 && selection.textBoxIds.size === 0) {
      return;
    }

    // Create undo action - store deleted elements with their IDs
    const deletedElements = Array.from(selection.elementIds)
      .sort((a, b) => b - a) // Sort descending for removal
      .map(id => ({ id, element: elements[id] }));

    const deletedTextBoxes = Array.from(selection.textBoxIds)
      .map(id => labels.textBoxes.find(tb => tb.id === id))
      .filter(Boolean) as TextBox[];

    // Remove elements (from highest index to lowest to maintain indices)
    const newElements = [...elements];
    deletedElements.forEach(({ id }) => {
      newElements.splice(id, 1);
    });
    setElements(newElements);

    // Remove textboxes
    const newTextBoxes = labels.textBoxes.filter(
      tb => !selection.textBoxIds.has(tb.id)
    );
    setLabels(prev => ({ ...prev, textBoxes: newTextBoxes }));

    // Update groups: remove deleted element IDs and adjust indices
    const deletedIds = new Set(selection.elementIds);
    const newGroups = groups
      .map(group => {
        // Remove deleted element IDs from group
        let updatedMemberIds = group.memberIds.filter(id => !deletedIds.has(id));

        // Adjust remaining member IDs (shift down for deleted elements before them)
        updatedMemberIds = updatedMemberIds.map(id => {
          // Count how many deleted elements come before this one
          const deletedBefore = Array.from(deletedIds).filter(delId => delId < id).length;
          return id - deletedBefore;
        });

        return {
          ...group,
          memberIds: updatedMemberIds
        };
      })
      // Filter out groups with < 2 members
      .filter(group => group.memberIds.length >= 2);

    setGroups(newGroups);

    // Clear selection
    setSelection({ elementIds: new Set(), textBoxIds: new Set() });

    // Add to history
    setActionHistory(prev => [...prev, {
      type: 'delete',
      deletedElements,
      deletedTextBoxes,
      previousElementsLength: elements.length
    }]);
    setRedoHistory([]);

    // Notify parent components
    if (onElementsChange) {
      onElementsChange(newElements.length);
    }
    if (onLabelsChange && deletedTextBoxes.length > 0) {
      onLabelsChange({ ...labels, textBoxes: newTextBoxes });
    }
  }, [selection, elements, labels, onElementsChange, onLabelsChange]);

  // Keyboard event listener for copy/paste/delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if in select or textbox mode
      if (drawMode !== 'select' && drawMode !== 'textbox') return;

      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return; // Don't intercept
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (cmdOrCtrl && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawMode, handleCopy, handlePaste, handleDelete]);

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

  const exportToJPEG = useCallback((quality: number = 0.9) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `easygraphs-${timestamp}.jpg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/jpeg', quality);
  }, []);

  const exportToPDF = useCallback((pageSize: string = 'letter', orientation: 'portrait' | 'landscape' = 'landscape') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imgData = canvas.toDataURL('image/png');

    import('jspdf').then(({ jsPDF }) => {
      const pdf = new jsPDF({ orientation, unit: 'px', format: pageSize });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;

      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);
      const canvasAspectRatio = canvas.width / canvas.height;
      const availableAspectRatio = availableWidth / availableHeight;

      let imgWidth, imgHeight, xOffset, yOffset;

      if (canvasAspectRatio > availableAspectRatio) {
        imgWidth = availableWidth;
        imgHeight = availableWidth / canvasAspectRatio;
        xOffset = margin;
        yOffset = margin + (availableHeight - imgHeight) / 2;
      } else {
        imgHeight = availableHeight;
        imgWidth = availableHeight * canvasAspectRatio;
        xOffset = margin + (availableWidth - imgWidth) / 2;
        yOffset = margin;
      }

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      pdf.save(`easygraphs-${timestamp}.pdf`);
    });
  }, []);

  const getExportData = useCallback((): GraphExportData => {
    return {
      elements: [...elements],
      fillAreas: [...fillAreas],
      panOffset: { ...panOffset },
      labels: { ...labels },
      groups: [...groups]
    };
  }, [elements, fillAreas, panOffset, labels, groups]);

  const importData = useCallback((data: GraphExportData) => {
    // Clear current state
    setSelection({ elementIds: new Set(), textBoxIds: new Set() });
    setDraggingPointIndex(null);
    setDraggingControlPointFlag(false);
    setCurrentPoints([]);
    setTempControlPoint(null);

    // Import new data
    setElements(data.elements || []);
    setFillAreas(data.fillAreas || []);
    setPanOffset(data.panOffset || { x: 0, y: 0 });
    setLabels(data.labels || DEFAULT_LABELS); // Backward compatibility
    setGroups(data.groups || []); // Backward compatibility

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
    // Return first selected element for backward compatibility
    const firstElementId = Array.from(selection.elementIds)[0];
    if (firstElementId === undefined || firstElementId >= elements.length) {
      return null;
    }
    return elements[firstElementId];
  }, [selection, elements]);

  const getSelectedElementId = useCallback(() => {
    // Return first selected element ID for backward compatibility
    const firstElementId = Array.from(selection.elementIds)[0];
    return firstElementId !== undefined ? firstElementId : null;
  }, [selection]);

  const updateSelectedElement = useCallback((color: string, lineWidth: number, addToHistory: boolean = false, previousState?: GraphElement, lineStyleParam?: 'solid' | 'dashed' | 'dotted', opacityParam?: number, arrowTypeParam?: 'none' | 'end' | 'start' | 'both') => {
    if (selection.elementIds.size === 0) {
      return;
    }

    // Update ALL selected elements
    const selectedIds = Array.from(selection.elementIds);

    // Check if valid
    if (selectedIds.some(id => id >= elements.length)) {
      return;
    }

    // Store previous states for undo if needed
    const previousStates: Array<{elementId: number, previousState: GraphElement}> = [];
    if (addToHistory) {
      selectedIds.forEach(id => {
        previousStates.push({
          elementId: id,
          previousState: { ...elements[id] }
        });
      });
    }

    setElements(prev => {
      const newElements = [...prev];
      selectedIds.forEach(id => {
        const element = { ...newElements[id] };
        element.color = color;
        element.lineWidth = lineWidth;
        if (lineStyleParam !== undefined) element.lineStyle = lineStyleParam;
        if (opacityParam !== undefined) element.opacity = opacityParam;
        if (arrowTypeParam !== undefined) element.arrowType = arrowTypeParam;
        newElements[id] = element;
      });
      return newElements;
    });

    // Add modification actions to history
    if (addToHistory) {
      previousStates.forEach(({ elementId, previousState: prevState }) => {
        setActionHistory(prev => [...prev, {
          type: 'modify',
          elementId,
          previousState: prevState
        }]);
      });
      setRedoHistory([]);
    }
  }, [selection, elements]);

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
    setSelection({
      elementIds: new Set(),
      textBoxIds: new Set([id])
    });
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
    exportToJPEG,
    exportToPDF,
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
    selectTextBox,
    copySelection: handleCopy,
    pasteSelection: handlePaste,
    deleteSelection: handleDelete,
    getSelection: () => selection,
    groupSelection: handleGroup,
    ungroupSelection: handleUngroup,
    getGroups: () => groups
  }), [addLineByCoordinates, addFillArea, addFunction, clearCanvas, undo, redo, elements, exportToPNG, exportToJPEG, exportToPDF, getSelectedElement, getSelectedElementId, updateSelectedElement, addModifyAction, getExportData, importData, togglePointProjection, getLabels, updateLabels, addTextBox, deleteTextBox, selectTextBox, handleCopy, handlePaste, handleDelete, selection, handleGroup, handleUngroup, groups]);

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
