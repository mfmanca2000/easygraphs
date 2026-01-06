/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { flushSync } from 'react-dom';
import { Parser } from 'expr-eval';
import type {
  Point,  
  GraphElement,
  FillArea,
  IntersectionPoint,
  GraphLabels,
  SelectionState,
  Group,
  ClipboardData,
  Action,
  GraphExportData,  
  GraphCanvasProps,
  GraphCanvasHandle,
  TextBox,
  ElementLabel
} from '@/app/types/canvas';
import { DEFAULT_LABELS } from '@/app/types/canvas';
import {
  canvasToGraph as canvasToGraphUtil,
  graphToCanvas as graphToCanvasUtil,
  calculateTitleOffset as calculateTitleOffsetUtil,
  calculateDefaultPanOffset as calculateDefaultPanOffsetUtil,
  isClickNearAxis as isClickNearAxisUtil,
  detectClickedAxis,
  isElementInSelectionBox as isElementInSelectionBoxUtil,
  isTextBoxInSelectionBox as isTextBoxInSelectionBoxUtil,
  isPointInTextBox as isPointInTextBoxUtil,
  getTextBoxResizeHandle,
  exportCanvasAsPNG,
  exportCanvasAsJPEG,
  drawLineElement,
  drawBezierElement,
  drawPointElement,
  drawFreehandElement,
  drawFunctionElement,
  simplifyPoints as simplifyPointsUtil,
  applyLineStyle,
  drawArrow,
  drawArrowAtStart,
  wrapText
} from '@/app/utils/canvas';
import {
  useCanvasElements,
  useCanvasDrawing,
  useCanvasSelection,
  useCanvasHistory,
  useCanvasPanning,
  useCanvasLabels,
  useCanvasGroups,
  useCanvasClipboard
} from '@/app/hooks/canvas';

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
    arrowSize,
    curveType,
    drawMode,
    scale,
    showIntersections = false,
    intersectionPoints = [],
    onCoordinateClick,
    onSelectionChange,
    onElementsChange,
    onScaleChange,
    onLabelsChange,
    onIntersectionContextMenu,
    onElementContextMenu,
    onAxisContextMenu
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Custom hooks for state management
  const {
    elements,
    setElements,
    fillAreas,
    setFillAreas    
  } = useCanvasElements();

  const {
    currentPoints,
    setCurrentPoints,
    isDrawing,
    setIsDrawing,
    tempControlPoint,
    setTempControlPoint,
    tempControlPoint2,
    setTempControlPoint2,
    draggingControl,
    setDraggingControl,
    draggingControl2,
    setDraggingControl2
  } = useCanvasDrawing();

  const {
    selection,
    setSelection,
    draggingPointIndex,
    setDraggingPointIndex,
    draggingControlPointFlag,
    setDraggingControlPointFlag,
    draggingControlPointFlag2,
    setDraggingControlPointFlag2,
    draggingEntireElement,
    setDraggingEntireElement,
    elementDragStart,
    setElementDragStart,
    selectedElementsOriginalStatesRef,
    mouseDownPosition,
    setMouseDownPosition,
    mouseDownOnElementId,
    setMouseDownOnElementId,
    mouseDownWithCtrl,
    setMouseDownWithCtrl,
    selectionBox,
    setSelectionBox,
    isDrawingSelectionBox,
    setIsDrawingSelectionBox,
    justFinishedSelectionBoxRef    
  } = useCanvasSelection();

  const {
    actionHistory,
    setActionHistory,
    redoHistory,
    setRedoHistory,
    undoInProgressRef
  } = useCanvasHistory();

  const {
    panOffset,
    setPanOffset,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    justPannedRef    
  } = useCanvasPanning();

  const {
    labels,
    setLabels,
    draggingTextBox,
    setDraggingTextBox,
    resizingTextBox,
    setResizingTextBox,
    textBoxDragOffset,
    setTextBoxDragOffset,
    selectedElementLabelIndex,
    setSelectedElementLabelIndex,
    draggingElementLabel,
    setDraggingElementLabel,
    labelsDragStartRef
  } = useCanvasLabels();

  const {
    groups,
    setGroups,   
    getGroupMembersForElement
  } = useCanvasGroups(selection);

  const {
    clipboard,
    setClipboard
  } = useCanvasClipboard();

  // Calculate title offset (space reserved at top for title)
  const getTitleOffset = useCallback((): number => {
    return calculateTitleOffsetUtil(labels.title.text, labels.title.yOffset, labels.title.fontSize);
  }, [labels.title]);

  // Convert canvas coordinates to graph coordinates
  const canvasToGraph = useCallback((canvasX: number, canvasY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return canvasToGraphUtil(canvasX, canvasY, canvas.width, canvas.height, scale, panOffset, getTitleOffset());
  }, [scale, panOffset, getTitleOffset]);

  // Convert graph coordinates to canvas coordinates
  const graphToCanvas = useCallback((graphX: number, graphY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return graphToCanvasUtil(graphX, graphY, canvas.width, canvas.height, scale, panOffset, getTitleOffset());
  }, [scale, panOffset, getTitleOffset]);

  // Helper function to check if a click is near the axis (for panning trigger)
  const isClickNearAxis = useCallback((canvasX: number, canvasY: number): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    return isClickNearAxisUtil(canvasX, canvasY, canvas.width, canvas.height, panOffset, getTitleOffset());
  }, [panOffset, getTitleOffset]);

  // Helper function to check if an element is within selection box
  const isElementInSelectionBox = useCallback((element: GraphElement, box: {start: Point, end: Point}): boolean => {
    return isElementInSelectionBoxUtil(element, box, graphToCanvas);
  }, [graphToCanvas]);

  // Helper function to check if a textbox is within selection box
  const isTextBoxInSelectionBox = useCallback((textBox: TextBox, box: {start: Point, end: Point}): boolean => {
    return isTextBoxInSelectionBoxUtil(textBox, box, graphToCanvas);
  }, [graphToCanvas]);

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
  }, [labels, elements, graphToCanvas, selection, getTitleOffset, panOffset, selectedElementLabelIndex]);

  // Helper function to check if a point is inside a text box
  const isPointInTextBox = useCallback((canvasX: number, canvasY: number, textBox: TextBox): boolean => {
    return isPointInTextBoxUtil(canvasX, canvasY, textBox, graphToCanvas);
  }, [graphToCanvas]);

  // Helper function to get which resize handle is being clicked
  const getResizeHandle = useCallback((canvasX: number, canvasY: number, textBox: TextBox): 'ne' | 'se' | 'sw' | 'nw' | null => {
    return getTextBoxResizeHandle(canvasX, canvasY, textBox, graphToCanvas);
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
  // Draw a line element
  const drawLine = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    drawLineElement(ctx, element, graphToCanvas);
  }, [graphToCanvas]);

  // Draw a bezier curve element
  const drawBezier = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    drawBezierElement(ctx, element, graphToCanvas);
  }, [graphToCanvas]);

  // Draw a point element
  const drawPoint = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    drawPointElement(ctx, element, graphToCanvas);
  }, [graphToCanvas]);


  // Draw a freehand curve with Catmull-Rom spline smoothing
  const drawFreehand = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    drawFreehandElement(ctx, element, graphToCanvas);
  }, [graphToCanvas]);

  // Draw a function curve
  const drawFunction = useCallback((ctx: CanvasRenderingContext2D, element: GraphElement) => {
    drawFunctionElement(ctx, element, graphToCanvas);
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
      const simplified = simplifyPointsUtil(element.points, 0.05);
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
  }, [elements, graphToCanvas, panOffset, simplifyPointsUtil, getTitleOffset]);

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

        // Render based on curve type
        if (curveType === 'quadratic') {
          ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
        } else if (curveType === 'cubic' && tempControlPoint2) {
          const control2 = graphToCanvas(tempControlPoint2.x, tempControlPoint2.y);
          ctx.bezierCurveTo(control.x, control.y, control2.x, control2.y, end.x, end.y);
        } else if (curveType === 's-curve') {
          // S-curve preview: calculate two control points
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const ctrlDx = control.x - (start.x + end.x) / 2;
          const ctrlDy = control.y - (start.y + end.y) / 2;
          const intensity = Math.sqrt(ctrlDx * ctrlDx + ctrlDy * ctrlDy) / dist;

          const cp1x = start.x + dx * 0.33 + ctrlDy * intensity;
          const cp1y = start.y + dy * 0.33 - ctrlDx * intensity;
          const cp2x = start.x + dx * 0.67 - ctrlDy * intensity;
          const cp2y = start.y + dy * 0.67 + ctrlDx * intensity;

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
        } else {
          // Fallback to quadratic
          ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
        }

        ctx.stroke();

        // Draw first control point
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(control.x, control.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw second control point for cubic curves
        if (curveType === 'cubic' && tempControlPoint2) {
          const control2 = graphToCanvas(tempControlPoint2.x, tempControlPoint2.y);
          ctx.fillStyle = 'blue';
          ctx.beginPath();
          ctx.arc(control2.x, control2.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
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
      const simplified = simplifyPointsUtil(currentPoints, 0.05);
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
            ctx.fillStyle = 'rgba(230, 126, 34, 0.15)';
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 14, 0, Math.PI * 2);
            ctx.fill();

            // Main circle - transparent fill with visible stroke
            ctx.fillStyle = 'rgba(230, 126, 34, 0.2)';
            ctx.strokeStyle = '#E67E22';
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
            ctx.fillStyle = 'rgba(230, 126, 34, 0.15)';
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 14, 0, Math.PI * 2);
            ctx.fill();

            // Main circle - transparent fill with visible stroke
            ctx.fillStyle = 'rgba(230, 126, 34, 0.2)';
            ctx.strokeStyle = '#E67E22';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });

          // Draw control point(s)
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

            const start = graphToCanvas(selectedElement.points[0].x, selectedElement.points[0].y);
            const end = graphToCanvas(selectedElement.points[1].x, selectedElement.points[1].y);

            // Draw second control point for cubic curves
            if (selectedElement.curveType === 'cubic' && selectedElement.controlPoint2) {
              const controlCanvas2 = graphToCanvas(selectedElement.controlPoint2.x, selectedElement.controlPoint2.y);
              ctx.fillStyle = '#3498DB';
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(controlCanvas2.x, controlCanvas2.y, 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              // Draw dashed lines showing cubic bezier structure
              ctx.setLineDash([5, 5]);
              ctx.strokeStyle = '#9B59B6';
              ctx.lineWidth = 1;

              ctx.beginPath();
              ctx.moveTo(start.x, start.y);
              ctx.lineTo(controlCanvas.x, controlCanvas.y);
              ctx.stroke();

              ctx.strokeStyle = '#3498DB';
              ctx.beginPath();
              ctx.moveTo(controlCanvas2.x, controlCanvas2.y);
              ctx.lineTo(end.x, end.y);
              ctx.stroke();
              ctx.setLineDash([]);
            } else {
              // Draw dashed lines from control point to endpoints (quadratic/s-curve)
              ctx.setLineDash([5, 5]);
              ctx.strokeStyle = '#9B59B6';
              ctx.lineWidth = 1;

              ctx.beginPath();
              ctx.moveTo(start.x, start.y);
              ctx.lineTo(controlCanvas.x, controlCanvas.y);
              ctx.lineTo(end.x, end.y);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        } else if (selectedElement.type === 'freehand') {
          // Draw a glow around first and last points
          [0, selectedElement.points.length - 1].forEach(idx => {
            if (idx < selectedElement.points.length) {
              const point = selectedElement.points[idx];
              const canvasPoint = graphToCanvas(point.x, point.y);

              // Outer glow
              ctx.fillStyle = 'rgba(230, 126, 34, 0.15)';
              ctx.beginPath();
              ctx.arc(canvasPoint.x, canvasPoint.y, 12, 0, Math.PI * 2);
              ctx.fill();

              // Main circle - transparent fill with visible stroke
              ctx.fillStyle = 'rgba(230, 126, 34, 0.2)';
              ctx.strokeStyle = '#E67E22';
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
                ctx.fillStyle = 'rgba(230, 126, 34, 0.15)';
                ctx.beginPath();
                ctx.arc(canvasPoint.x, canvasPoint.y, 12, 0, Math.PI * 2);
                ctx.fill();

                // Main circle - transparent fill with visible stroke
                ctx.fillStyle = 'rgba(230, 126, 34, 0.2)';
                ctx.strokeStyle = '#E67E22';
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

    // Draw global intersection markers if enabled
    if (showIntersections && intersectionPoints.length > 0) {
      intersectionPoints.forEach((intersection) => {
        // Skip if this intersection is hidden
        if (intersection.visible === false) return;

        const intersectionCanvas = graphToCanvas(intersection.point.x, intersection.point.y);

        // Draw intersection marker (small circle with different color)
        ctx.fillStyle = '#9B59B6'; // Purple color for intersections
        ctx.beginPath();
        ctx.arc(intersectionCanvas.x, intersectionCanvas.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw a small ring around it
        ctx.strokeStyle = '#9B59B6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(intersectionCanvas.x, intersectionCanvas.y, 8, 0, Math.PI * 2);
        ctx.stroke();

        // Draw projection lines for this intersection if enabled
        if (intersection.showProjection) {
          ctx.globalAlpha = 0.7;
          ctx.strokeStyle = '#9B59B6';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]); // Dashed lines for intersection projections

          const xAxis = graphToCanvas(intersection.point.x, 0);
          const yAxis = graphToCanvas(0, intersection.point.y);

          // Vertical line to x-axis
          ctx.beginPath();
          ctx.moveTo(intersectionCanvas.x, intersectionCanvas.y);
          ctx.lineTo(xAxis.x, xAxis.y);
          ctx.stroke();

          // Horizontal line to y-axis
          ctx.beginPath();
          ctx.moveTo(intersectionCanvas.x, intersectionCanvas.y);
          ctx.lineTo(yAxis.x, yAxis.y);
          ctx.stroke();

          // Draw small markers on axes
          ctx.setLineDash([]); // Solid lines
          ctx.fillStyle = '#9B59B6';

          // Marker on x-axis
          ctx.beginPath();
          ctx.arc(xAxis.x, xAxis.y, 3, 0, Math.PI * 2);
          ctx.fill();

          // Marker on y-axis
          ctx.beginPath();
          ctx.arc(yAxis.x, yAxis.y, 3, 0, Math.PI * 2);
          ctx.fill();

          // Reset line dash and opacity
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      });
    }
  }, [drawGrid, elements, fillAreas, currentPoints, tempControlPoint, tempControlPoint2, curveType, isDrawing, drawMode, strokeColor, strokeWidth, graphToCanvas, drawLine, drawBezier, drawFreehand, drawPoint, drawFunction, fillAreaForElement, selection, selectionBox, isDrawingSelectionBox, simplifyPointsUtil, renderLabels, groups, showIntersections, intersectionPoints]);

  // Re-render when dependencies change
  useEffect(() => {
    render();
  }, [render]);

  // Initialize default pan offset when canvas dimensions change
  // This ensures the view is correctly positioned even after responsive layout changes
  const lastCanvasDimensions = useRef({ width: 0, height: 0 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width === 0 || canvas.height === 0) return;

    // Check if canvas dimensions have changed
    const dimensionsChanged =
      lastCanvasDimensions.current.width !== canvas.width ||
      lastCanvasDimensions.current.height !== canvas.height;

    if (!dimensionsChanged) return;

    console.log('[PanOffset Auto-adjust] Canvas dimensions changed:', canvas.width, 'x', canvas.height);

    lastCanvasDimensions.current = { width: canvas.width, height: canvas.height };

    const titleOffset = getTitleOffset();
    const defaultPanOffset = calculateDefaultPanOffsetUtil(
      canvas.width,
      canvas.height,
      scale,
      titleOffset
    );

    console.log('[PanOffset Auto-adjust] New offset:', defaultPanOffset.x, ',', defaultPanOffset.y);
    setPanOffset(defaultPanOffset);
  }, [width, height, scale]); // Run when canvas dimensions or scale change

  // Clear selection when switching away from select/textbox modes
  useEffect(() => {
    if (drawMode !== 'select' && drawMode !== 'textbox') {
      setSelection({ elementIds: new Set(), textBoxIds: new Set() });
    }
  }, [drawMode]);


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

    // Check control points for bezier
    if (element.type === 'bezier') {
      // Check second control point first (cubic curves) for better UX
      if (element.controlPoint2 && isPointNear(canvasX, canvasY, element.controlPoint2, 15)) {
        return { type: 'control', index: 1 };
      }
      // Check first control point
      if (element.controlPoint && isPointNear(canvasX, canvasY, element.controlPoint, 15)) {
        return { type: 'control', index: 0 };
      }
    }

    return null;
  };

  // Helper function to find if a click is near an intersection point
  const findClickedIntersection = (canvasX: number, canvasY: number): number | null => {
    if (!intersectionPoints || intersectionPoints.length === 0) {
      return null;
    }

    const threshold = 10; // pixels

    for (let i = 0; i < intersectionPoints.length; i++) {
      const intersection = intersectionPoints[i];
      const { x: intCanvasX, y: intCanvasY } = graphToCanvas(intersection.point.x, intersection.point.y);

      const distance = Math.sqrt(
        Math.pow(canvasX - intCanvasX, 2) + Math.pow(canvasY - intCanvasY, 2)
      );

      if (distance <= threshold) {
        return i;
      }
    }

    return null;
  };

  // Handle right-click on canvas (for context menu on intersections, elements, axes)
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const { x: canvasX, y: canvasY } = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for intersection first (highest priority)
    const intersectionIndex = findClickedIntersection(canvasX, canvasY);
    if (intersectionIndex !== null && onIntersectionContextMenu) {
      const rect = canvas.getBoundingClientRect();
      if (rect) {
        onIntersectionContextMenu(intersectionIndex, e.clientX, e.clientY);
        return;
      }
    }

    // Check for any element (Point or other types)
    const elementId = findClickedElement(canvasX, canvasY);
    if (elementId !== null && onElementContextMenu) {
      const rect = canvas.getBoundingClientRect();
      if (rect) {
        onElementContextMenu(elementId, e.clientX, e.clientY);
        return;
      }
    }

    // Check for axis click (lowest priority)
    const clickedAxis = detectClickedAxis(canvasX, canvasY, canvas.width, canvas.height, panOffset, getTitleOffset());
    if (clickedAxis && onAxisContextMenu) {
      const rect = canvas.getBoundingClientRect();
      if (rect) {
        onAxisContextMenu(clickedAxis, e.clientX, e.clientY);
      }
    }
  };

  // Long press detection for mobile
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressPositionRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStartForLongPress = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    const { x: canvasX, y: canvasY } = getCanvasCoordinates(e);
    const canvas = canvasRef.current;

    longPressPositionRef.current = { x: canvasX, y: canvasY };

    longPressTimerRef.current = setTimeout(() => {
      if (longPressPositionRef.current && canvas) {
        // Check for intersection first (highest priority)
        const intersectionIndex = findClickedIntersection(
          longPressPositionRef.current.x,
          longPressPositionRef.current.y
        );

        if (intersectionIndex !== null && onIntersectionContextMenu) {
          const rect = canvas.getBoundingClientRect();
          if (rect) {
            onIntersectionContextMenu(
              intersectionIndex,
              touch.clientX,
              touch.clientY
            );
            return;
          }
        }

        // Check for any element if no intersection found
        const elementId = findClickedElement(
          longPressPositionRef.current.x,
          longPressPositionRef.current.y
        );

        if (elementId !== null && onElementContextMenu) {
          const rect = canvas.getBoundingClientRect();
          if (rect) {
            onElementContextMenu(
              elementId,
              touch.clientX,
              touch.clientY
            );
            return;
          }
        }

        // Check for axis click (lowest priority)
        const clickedAxis = detectClickedAxis(
          longPressPositionRef.current.x,
          longPressPositionRef.current.y,
          canvas.width,
          canvas.height,
          panOffset,
          getTitleOffset()
        );

        if (clickedAxis && onAxisContextMenu) {
          const rect = canvas.getBoundingClientRect();
          if (rect) {
            onAxisContextMenu(
              clickedAxis,
              touch.clientX,
              touch.clientY
            );
          }
        }
      }
    }, 500); // 500ms for long press
  };

  const handleTouchMoveForLongPress = () => {
    // Cancel long press if finger moves
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressPositionRef.current = null;
  };

  const handleTouchEndForLongPress = () => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressPositionRef.current = null;
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
          arrowType: arrowType,
          arrowSize: arrowSize
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

    // Track mouse down position and clicked element for drag threshold detection
    if (drawMode === 'select') {
      const clickedElementId = findClickedElement(canvasX, canvasY);
      if (clickedElementId !== null) {
        // Check if we're clicking on a point of this element (if it's selected)
        // If so, don't track for element drag - let point dragging handle it
        const isClickedElementSelected = selection.elementIds.has(clickedElementId);
        const clickedPoint = isClickedElementSelected ? findClickedPoint(canvasX, canvasY, clickedElementId) : null;

        if (!clickedPoint) {
          // Not clicking on a point, track for potential element drag
          setMouseDownPosition({ x: canvasX, y: canvasY });
          setMouseDownOnElementId(clickedElementId);
          setMouseDownWithCtrl(isCtrlPressed);
        }
      }
    }

    // If CTRL is pressed but no element is clicked, start panning
    if (isCtrlPressed && mouseDownOnElementId === null && selection.elementIds.size === 0) {
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
        } else if (clickedPoint.type === 'control') {
          // clickedPoint.index: 0 = first control point, 1 = second control point
          if (clickedPoint.index === 0) {
            setDraggingControlPointFlag(true);
          } else {
            setDraggingControlPointFlag2(true);
          }
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
        // Check if clicking near axis - if so, start panning
        if (isClickNearAxis(canvasX, canvasY)) {
          setIsPanning(true);
          setPanStart({ x: canvasX, y: canvasY });
        } else {
          // No object clicked and not near axis, start selection box
          setIsDrawingSelectionBox(true);
          setSelectionBox({
            start: { x: canvasX, y: canvasY },
            end: { x: canvasX, y: canvasY }
          });
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x: canvasX, y: canvasY } = getCanvasCoordinates(e);
    const firstElementId = Array.from(selection.elementIds)[0];

    // Check for drag threshold (5px movement to start dragging)
    if (mouseDownPosition && mouseDownOnElementId !== null && !draggingEntireElement) {
      const deltaX = canvasX - mouseDownPosition.x;
      const deltaY = canvasY - mouseDownPosition.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > 5) {
        // Threshold met - start dragging
        const clickedElementId = mouseDownOnElementId;
        const groupMembers = getGroupMembersForElement(clickedElementId);

        // Determine which elements will be in the final selection after this action
        let elementsToDrag: Set<number>;

        if (mouseDownWithCtrl) {
          // Toggle the element in selection
          const allMembersSelected = Array.from(groupMembers).every(id => selection.elementIds.has(id));

          if (allMembersSelected) {
            // Remove all group members from selection
            elementsToDrag = new Set(selection.elementIds);
            groupMembers.forEach(id => elementsToDrag.delete(id));
          } else {
            // Add all group members to selection
            elementsToDrag = new Set(selection.elementIds);
            groupMembers.forEach(id => elementsToDrag.add(id));
          }

          setSelection(prev => ({
            ...prev,
            elementIds: elementsToDrag
          }));
        } else {
          // Replace selection with clicked element (if not already selected)
          if (!selection.elementIds.has(clickedElementId)) {
            elementsToDrag = groupMembers;
            setSelection({
              elementIds: groupMembers,
              textBoxIds: new Set()
            });
          } else {
            // Element already selected, drag current selection
            elementsToDrag = new Set(selection.elementIds);
          }
        }

        // Store original states for all elements that will be dragged
        const originalStates = new Map<number, GraphElement>();
        elementsToDrag.forEach(elementId => {
          if (elementId < elements.length) {
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

        // Clear mouse down tracking
        setMouseDownPosition(null);
        setMouseDownOnElementId(null);
        setMouseDownWithCtrl(false);

        return;
      }
    }

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

      // Capture the ref value to avoid closure issues
      const originalStates = selectedElementsOriginalStatesRef.current;

      // Calculate total delta from initial drag start position
      const deltaX = canvasX - elementDragStart.x;
      const deltaY = canvasY - elementDragStart.y;

      // Convert canvas delta to graph delta
      const deltaGraphX = deltaX / scale.x;
      const deltaGraphY = -deltaY / scale.y; // Negative because canvas Y is inverted

      setElements(prev => {
        const newElements = [...prev];

        // Translate all selected elements
        originalStates.forEach((originalElement, elementId) => {
          const element = { ...newElements[elementId] };

          // Translate all points based on original positions + total delta
          element.points = originalElement.points.map(p => ({
            x: p.x + deltaGraphX,
            y: p.y + deltaGraphY
          }));

          // Translate control points if it's a bezier
          if (element.type === 'bezier') {
            if (originalElement.controlPoint) {
              element.controlPoint = {
                x: originalElement.controlPoint.x + deltaGraphX,
                y: originalElement.controlPoint.y + deltaGraphY
              };
            }
            if (originalElement.controlPoint2) {
              element.controlPoint2 = {
                x: originalElement.controlPoint2.x + deltaGraphX,
                y: originalElement.controlPoint2.y + deltaGraphY
              };
            }
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
        // Dragging bezier first control point
        setElements(prev => {
          const newElements = [...prev];
          const element = { ...newElements[firstElementId] };
          if (element.type === 'bezier') {
            element.controlPoint = point;
          }
          newElements[firstElementId] = element;
          return newElements;
        });
      } else if (draggingControlPointFlag2) {
        // Dragging bezier second control point (cubic curves)
        setElements(prev => {
          const newElements = [...prev];
          const element = { ...newElements[firstElementId] };
          if (element.type === 'bezier' && element.controlPoint2) {
            element.controlPoint2 = point;
          }
          newElements[firstElementId] = element;
          return newElements;
        });
      }
    } else if (drawMode === 'freehand' && isDrawing) {
      setCurrentPoints(prev => [...prev, point]);
    } else if (drawMode === 'bezier' && draggingControl) {
      setTempControlPoint(point);
    } else if (drawMode === 'bezier' && draggingControl2) {
      setTempControlPoint2(point);
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
    setDraggingControlPointFlag2(false);

    if (drawMode === 'freehand' && isDrawing && currentPoints.length > 1) {
      const newElement: GraphElement = {
        type: 'freehand',
        points: currentPoints,
        color: strokeColor,
        lineWidth: strokeWidth,
        lineStyle: lineStyle,
        opacity: opacity,
        arrowType: arrowType,
        arrowSize: arrowSize
      };
      setElements(prev => [...prev, newElement]);
      setActionHistory(prev => [...prev, { type: 'element' }]);
      setRedoHistory([]);
      setCurrentPoints([]);
      setIsDrawing(false);
    } else if (drawMode === 'bezier' && (draggingControl || draggingControl2)) {
      if (currentPoints.length === 2 && tempControlPoint) {
        // For cubic curves, wait for second control point if it's being dragged
        if (curveType === 'cubic' && draggingControl && !tempControlPoint2) {
          // First control point set, now wait for second control point
          setDraggingControl(false);
          // Auto-generate second control point as mirror of first
          const midX = (currentPoints[0].x + currentPoints[1].x) / 2;
          const midY = (currentPoints[0].y + currentPoints[1].y) / 2;
          const cp2X = 2 * midX - tempControlPoint.x;
          const cp2Y = 2 * midY - tempControlPoint.y;
          setTempControlPoint2({ x: cp2X, y: cp2Y });
          setDraggingControl2(true);
          return;
        }

        const newElement: GraphElement = {
          type: 'bezier',
          points: currentPoints,
          controlPoint: tempControlPoint,
          controlPoint2: curveType === 'cubic' ? (tempControlPoint2 ?? undefined) : undefined,
          curveType: curveType,
          color: strokeColor,
          lineWidth: strokeWidth,
          lineStyle: lineStyle,
          opacity: opacity,
          arrowType: arrowType,
          arrowSize: arrowSize
        };
        setElements(prev => [...prev, newElement]);
        setActionHistory(prev => [...prev, { type: 'element' }]);
        setRedoHistory([]);
        setCurrentPoints([]);
        setTempControlPoint(null);
        setTempControlPoint2(null);
      }
      setDraggingControl(false);
      setDraggingControl2(false);
    }

    // Clean up mouse down tracking state
    setMouseDownPosition(null);
    setMouseDownOnElementId(null);
    setMouseDownWithCtrl(false);
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
      arrowType: arrowType,
      arrowSize: arrowSize
    };
    setElements(prev => [...prev, newElement]);
    setActionHistory(prev => [...prev, { type: 'element' }]);
    setRedoHistory([]);
  }, [strokeColor, strokeWidth, lineStyle, opacity, arrowType, arrowSize]);

  const addPointByCoordinates = useCallback((point: Point) => {
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
    setElements(prev => [...prev, newElement]);
    setActionHistory(prev => [...prev, { type: 'element' }]);
    setRedoHistory([]);
  }, [strokeColor, strokeWidth, lineStyle, opacity]);

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
    setDraggingControlPointFlag2(false);
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

  // Calculate intersection points between all elements
  const calculateAllIntersections = useCallback((): IntersectionPoint[] => {
    const intersections: IntersectionPoint[] = [];

    // Check all pairs of elements
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const el1 = elements[i];
        const el2 = elements[j];

        // Get line segments from each element
        const segments1 = getElementSegments(el1);
        const segments2 = getElementSegments(el2);

        // Check all segment pairs for intersections
        segments1.forEach(seg1 => {
          segments2.forEach(seg2 => {
            const intersect = lineIntersection(seg1.start, seg1.end, seg2.start, seg2.end);
            if (intersect) {
              // Check if we already have this intersection (avoid duplicates)
              const isDuplicate = intersections.some(existing =>
                Math.abs(existing.point.x - intersect.x) < 0.01 &&
                Math.abs(existing.point.y - intersect.y) < 0.01
              );
              if (!isDuplicate) {
                intersections.push({
                  point: intersect,
                  elementId1: i,
                  elementId2: j,
                  showProjection: false
                });
              }
            }
          });
        });
      }
    }

    return intersections;
  }, [elements]);

  // Helper to get line segments from an element
  const getElementSegments = (element: GraphElement): Array<{ start: Point; end: Point }> => {
    const segments: Array<{ start: Point; end: Point }> = [];

    if (element.type === 'line') {
      segments.push({
        start: element.points[0],
        end: element.points[1]
      });
    } else if (element.type === 'bezier') {
      // For bezier curves, sample the curve into line segments
      if (element.points.length >= 2 && element.controlPoint) {
        const sampledPoints = sampleBezierCurve(element);
        for (let i = 0; i < sampledPoints.length - 1; i++) {
          segments.push({
            start: sampledPoints[i],
            end: sampledPoints[i + 1]
          });
        }
      }
    } else if (element.type === 'freehand' || element.type === 'function') {
      // For freehand and function curves, use the sampled points as line segments
      for (let i = 0; i < element.points.length - 1; i++) {
        segments.push({
          start: element.points[i],
          end: element.points[i + 1]
        });
      }
    }
    // Note: point type doesn't have segments

    return segments;
  };

  // Helper to sample a bezier curve into discrete points
  const sampleBezierCurve = (element: GraphElement): Point[] => {
    if (!element.controlPoint || element.points.length < 2) return [];

    const start = element.points[0];
    const end = element.points[1];
    const control = element.controlPoint;
    const elementCurveType = element.curveType || 'quadratic';

    // Number of samples - more samples = better intersection detection but slower
    const numSamples = 50;
    const sampledPoints: Point[] = [];

    if (elementCurveType === 'quadratic') {
      // Quadratic Bezier curve: B(t) = (1-t)^2*P0 + 2*(1-t)*t*P1 + t^2*P2
      for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const oneMinusT = 1 - t;
        const x = oneMinusT * oneMinusT * start.x +
                  2 * oneMinusT * t * control.x +
                  t * t * end.x;
        const y = oneMinusT * oneMinusT * start.y +
                  2 * oneMinusT * t * control.y +
                  t * t * end.y;
        sampledPoints.push({ x, y });
      }
    } else if (elementCurveType === 'cubic' && element.controlPoint2) {
      // Cubic Bezier curve: B(t) = (1-t)^3*P0 + 3*(1-t)^2*t*P1 + 3*(1-t)*t^2*P2 + t^3*P3
      const control2 = element.controlPoint2;
      for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const oneMinusT = 1 - t;
        const x = oneMinusT * oneMinusT * oneMinusT * start.x +
                  3 * oneMinusT * oneMinusT * t * control.x +
                  3 * oneMinusT * t * t * control2.x +
                  t * t * t * end.x;
        const y = oneMinusT * oneMinusT * oneMinusT * start.y +
                  3 * oneMinusT * oneMinusT * t * control.y +
                  3 * oneMinusT * t * t * control2.y +
                  t * t * t * end.y;
        sampledPoints.push({ x, y });
      }
    } else if (elementCurveType === 's-curve') {
      // S-curve: calculate control points similar to drawBezier
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const ctrlDx = control.x - (start.x + end.x) / 2;
      const ctrlDy = control.y - (start.y + end.y) / 2;
      const intensity = dist > 0 ? Math.sqrt(ctrlDx * ctrlDx + ctrlDy * ctrlDy) / dist : 0;

      const cp1 = {
        x: start.x + dx * 0.33 + ctrlDy * intensity,
        y: start.y + dy * 0.33 - ctrlDx * intensity
      };
      const cp2 = {
        x: start.x + dx * 0.67 - ctrlDy * intensity,
        y: start.y + dy * 0.67 + ctrlDx * intensity
      };

      // Sample cubic bezier with calculated control points
      for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const oneMinusT = 1 - t;
        const x = oneMinusT * oneMinusT * oneMinusT * start.x +
                  3 * oneMinusT * oneMinusT * t * cp1.x +
                  3 * oneMinusT * t * t * cp2.x +
                  t * t * t * end.x;
        const y = oneMinusT * oneMinusT * oneMinusT * start.y +
                  3 * oneMinusT * oneMinusT * t * cp1.y +
                  3 * oneMinusT * t * t * cp2.y +
                  t * t * t * end.y;
        sampledPoints.push({ x, y });
      }
    }

    return sampledPoints;
  };

  // Helper function to find line-line intersection
  const lineIntersection = (p1: Point, p2: Point, p3: Point, p4: Point): Point | null => {
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null; // Parallel lines

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }

    return null;
  };


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
    exportCanvasAsPNG(canvas);
  }, []);

  const exportToJPEG = useCallback((quality: number = 0.9) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    exportCanvasAsJPEG(canvas, 'easygraphs', quality);
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
    setDraggingControlPointFlag2(false);
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

  const updateSelectedElement = useCallback((color: string, lineWidth: number, addToHistory: boolean = false, previousState?: GraphElement, lineStyleParam?: 'solid' | 'dashed' | 'dotted', opacityParam?: number, arrowTypeParam?: 'none' | 'end' | 'start' | 'both', arrowSizeParam?: number) => {
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
        if (arrowSizeParam !== undefined) element.arrowSize = arrowSizeParam;
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
    addPointByCoordinates,
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
    calculateAllIntersections,
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
    getGroups: () => groups,
    resetPanOffset: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      console.log('[Reset Button] Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('[Reset Button] Scale:', scale.x, 'x', scale.y);

      const titleOffset = getTitleOffset();
      console.log('[Reset Button] Title offset:', titleOffset);

      const defaultPanOffset = calculateDefaultPanOffsetUtil(
        canvas.width,
        canvas.height,
        scale,
        titleOffset
      );

      console.log('[Reset Button] Calculated offset:', defaultPanOffset.x, ',', defaultPanOffset.y);
      console.log('[Reset Button] Current panOffset before set:', panOffset.x, ',', panOffset.y);
      setPanOffset(defaultPanOffset);
    }
  }), [addLineByCoordinates, addPointByCoordinates, addFillArea, addFunction, clearCanvas, undo, redo, elements, exportToPNG, exportToJPEG, exportToPDF, getSelectedElement, getSelectedElementId, updateSelectedElement, addModifyAction, getExportData, importData, togglePointProjection, calculateAllIntersections, getLabels, updateLabels, addTextBox, deleteTextBox, selectTextBox, handleCopy, handlePaste, handleDelete, selection, handleGroup, handleUngroup, groups, scale, getTitleOffset]);

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
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={(e) => {
        e.preventDefault();
        handleTouchStartForLongPress(e);
        handleMouseDown(e);
        // For touch devices, also handle click logic on touch start
        if (drawMode === 'line' || drawMode === 'bezier' || drawMode === 'select' || drawMode === 'point') {
          handleCanvasClick(e);
        }
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        handleTouchMoveForLongPress();
        handleMouseMove(e);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        handleTouchEndForLongPress();
        handleMouseUp();
      }}
    />
  );
});

GraphCanvas.displayName = 'GraphCanvas';

export default GraphCanvas;
