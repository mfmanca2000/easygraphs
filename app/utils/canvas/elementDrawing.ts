// Element drawing functions for GraphCanvas

import type { GraphElement, Point } from '@/app/types/canvas';
import { applyLineStyle, drawArrow, drawArrowAtStart } from './rendering';
import { simplifyPoints } from './geometry';

type GraphToCanvasFunc = (x: number, y: number) => Point;

/**
 * Draw a line element
 */
export function drawLineElement(
  ctx: CanvasRenderingContext2D,
  element: GraphElement,
  graphToCanvas: GraphToCanvasFunc
): void {
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
  const arrowSize = element.arrowSize ?? Math.max(5, Math.min(40, element.lineWidth * 0.75));

  if (arrowType === 'end' || arrowType === 'both') {
    drawArrow(ctx, start.x, start.y, end.x, end.y, arrowSize, element.color, element.opacity ?? 1);
  }
  if (arrowType === 'start' || arrowType === 'both') {
    drawArrowAtStart(ctx, start.x, start.y, end.x, end.y, arrowSize, element.color, element.opacity ?? 1);
  }

  // Reset to defaults
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
}

/**
 * Draw a bezier curve element
 */
export function drawBezierElement(
  ctx: CanvasRenderingContext2D,
  element: GraphElement,
  graphToCanvas: GraphToCanvasFunc
): void {
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

  const elementCurveType = element.curveType || 'quadratic';

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);

  if (elementCurveType === 'quadratic') {
    // Quadratic Bezier curve with one control point
    ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
  } else if (elementCurveType === 'cubic' && element.controlPoint2) {
    // Cubic Bezier curve with two control points
    const control2 = graphToCanvas(element.controlPoint2.x, element.controlPoint2.y);
    ctx.bezierCurveTo(control.x, control.y, control2.x, control2.y, end.x, end.y);
  } else if (elementCurveType === 's-curve') {
    // S-curve: calculate two control points for smooth S-shape
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Use the control point to determine the curve intensity
    const ctrlDx = control.x - (start.x + end.x) / 2;
    const ctrlDy = control.y - (start.y + end.y) / 2;
    const intensity = dist > 0 ? Math.sqrt(ctrlDx * ctrlDx + ctrlDy * ctrlDy) / dist : 0;

    // Create symmetric control points for S-curve
    const cp1x = start.x + dx * 0.33 + ctrlDy * intensity;
    const cp1y = start.y + dy * 0.33 - ctrlDx * intensity;
    const cp2x = start.x + dx * 0.67 - ctrlDy * intensity;
    const cp2y = start.y + dy * 0.67 + ctrlDx * intensity;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
  }

  ctx.stroke();

  // Draw arrows if configured
  const arrowType = element.arrowType || 'none';
  const arrowSize = element.arrowSize ?? Math.max(5, Math.min(40, element.lineWidth * 0.75));

  if (arrowType === 'end' || arrowType === 'both') {
    // Arrow at end: use tangent from control point to end point
    if (elementCurveType === 'cubic' && element.controlPoint2) {
      const control2 = graphToCanvas(element.controlPoint2.x, element.controlPoint2.y);
      drawArrow(ctx, control2.x, control2.y, end.x, end.y, arrowSize, element.color, element.opacity ?? 1);
    } else {
      drawArrow(ctx, control.x, control.y, end.x, end.y, arrowSize, element.color, element.opacity ?? 1);
    }
  }
  if (arrowType === 'start' || arrowType === 'both') {
    // Arrow at start: use tangent from start point to control point
    drawArrowAtStart(ctx, start.x, start.y, control.x, control.y, arrowSize, element.color, element.opacity ?? 1);
  }

  // Reset to defaults
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
}

/**
 * Draw a point element
 */
export function drawPointElement(
  ctx: CanvasRenderingContext2D,
  element: GraphElement,
  graphToCanvas: GraphToCanvasFunc
): void {
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
}

/**
 * Draw a freehand element with Catmull-Rom spline smoothing
 */
export function drawFreehandElement(
  ctx: CanvasRenderingContext2D,
  element: GraphElement,
  graphToCanvas: GraphToCanvasFunc
): void {
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
  const arrowSize = element.arrowSize ?? Math.max(5, Math.min(40, element.lineWidth * 0.75));

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
}

/**
 * Draw a function element
 */
export function drawFunctionElement(
  ctx: CanvasRenderingContext2D,
  element: GraphElement,
  graphToCanvas: GraphToCanvasFunc
): void {
  if (element.points.length < 2) return;

  ctx.strokeStyle = element.color;
  ctx.lineWidth = element.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Apply line style and opacity
  applyLineStyle(ctx, element.lineStyle, element.opacity);

  ctx.beginPath();
  let firstValidPoint = true;

  for (let i = 0; i < element.points.length; i++) {
    const point = graphToCanvas(element.points[i].x, element.points[i].y);

    if (firstValidPoint) {
      ctx.moveTo(point.x, point.y);
      firstValidPoint = false;
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }

  ctx.stroke();

  // Reset to defaults
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
}
