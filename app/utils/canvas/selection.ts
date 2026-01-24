// Selection box and hit detection utilities

import type { Point, GraphElement, TextBox } from '@/app/types/canvas';
import { lineSegmentsIntersect } from './geometry';

/**
 * Check if a point is within a rectangular box
 */
export function isPointInBox(
  canvasX: number,
  canvasY: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): boolean {
  return canvasX >= minX && canvasX <= maxX && canvasY >= minY && canvasY <= maxY;
}

/**
 * Check if a line segment intersects with or is contained in a rectangular box
 */
export function lineIntersectsBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): boolean {
  // If either endpoint is in the box, the line is selected
  if (isPointInBox(x1, y1, minX, maxX, minY, maxY) ||
      isPointInBox(x2, y2, minX, maxX, minY, maxY)) {
    return true;
  }

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
}

/**
 * Check if an element is within a selection box
 */
export function isElementInSelectionBox(
  element: GraphElement,
  box: { start: Point; end: Point },
  graphToCanvas: (x: number, y: number) => Point
): boolean {
  const minX = Math.min(box.start.x, box.end.x);
  const maxX = Math.max(box.start.x, box.end.x);
  const minY = Math.min(box.start.y, box.end.y);
  const maxY = Math.max(box.start.y, box.end.y);

  // For lines, check if the line segments intersect with the box
  if (element.type === 'line' && element.points.length === 2) {
    const p1 = graphToCanvas(element.points[0].x, element.points[0].y);
    const p2 = graphToCanvas(element.points[1].x, element.points[1].y);
    return lineIntersectsBox(p1.x, p1.y, p2.x, p2.y, minX, maxX, minY, maxY);
  }

  // For freehand, check if any segment intersects
  if (element.type === 'freehand') {
    for (let i = 0; i < element.points.length - 1; i++) {
      const p1 = graphToCanvas(element.points[i].x, element.points[i].y);
      const p2 = graphToCanvas(element.points[i + 1].x, element.points[i + 1].y);
      if (lineIntersectsBox(p1.x, p1.y, p2.x, p2.y, minX, maxX, minY, maxY)) {
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
    if (isPointInBox(p1.x, p1.y, minX, maxX, minY, maxY) ||
        isPointInBox(p2.x, p2.y, minX, maxX, minY, maxY) ||
        isPointInBox(cp.x, cp.y, minX, maxX, minY, maxY)) {
      return true;
    }

    // Sample points along the bezier curve
    for (let t = 0; t <= 1; t += 0.1) {
      const x = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * cp.x + t * t * p2.x;
      const y = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * cp.y + t * t * p2.y;
      if (isPointInBox(x, y, minX, maxX, minY, maxY)) {
        return true;
      }
    }
    return false;
  }

  // For point elements or functions, check if any point is within the box
  return element.points.some(point => {
    const canvasPoint = graphToCanvas(point.x, point.y);
    return isPointInBox(canvasPoint.x, canvasPoint.y, minX, maxX, minY, maxY);
  });
}

/**
 * Check if a textbox is within a selection box
 */
export function isTextBoxInSelectionBox(
  textBox: TextBox,
  box: { start: Point; end: Point },
  graphToCanvas: (x: number, y: number) => Point
): boolean {
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
}

/**
 * Check if a point is inside a textbox
 */
export function isPointInTextBox(
  canvasX: number,
  canvasY: number,
  textBox: TextBox,
  graphToCanvas: (x: number, y: number) => Point,
  scale: { x: number; y: number }
): boolean {
  let x = textBox.x;
  let y = textBox.y;
  let width = textBox.width;
  let height = textBox.height;

  if (textBox.coordinateSystem === 'graph') {
    const canvasPoint = graphToCanvas(textBox.x, textBox.y);
    x = canvasPoint.x;
    y = canvasPoint.y;
    // Convert dimensions from graph units to canvas pixels
    width = textBox.width * scale.x;
    height = textBox.height * scale.y;
  }

  return canvasX >= x && canvasX <= x + width &&
         canvasY >= y && canvasY <= y + height;
}

/**
 * Get which resize handle (corner) is being clicked on a textbox
 */
export function getTextBoxResizeHandle(
  canvasX: number,
  canvasY: number,
  textBox: TextBox,
  graphToCanvas: (x: number, y: number) => Point,
  scale: { x: number; y: number }
): 'ne' | 'se' | 'sw' | 'nw' | null {
  let x = textBox.x;
  let y = textBox.y;
  let width = textBox.width;
  let height = textBox.height;

  if (textBox.coordinateSystem === 'graph') {
    const canvasPoint = graphToCanvas(textBox.x, textBox.y);
    x = canvasPoint.x;
    y = canvasPoint.y;
    // Convert dimensions from graph units to canvas pixels
    width = textBox.width * scale.x;
    height = textBox.height * scale.y;
  }

  const handleSize = 8;
  const corners = [
    { corner: 'nw' as const, x, y },
    { corner: 'ne' as const, x: x + width, y },
    { corner: 'se' as const, x: x + width, y: y + height },
    { corner: 'sw' as const, x, y: y + height }
  ];

  for (const { corner, x: cx, y: cy } of corners) {
    const distance = Math.sqrt((canvasX - cx) ** 2 + (canvasY - cy) ** 2);
    if (distance <= handleSize) return corner;
  }
  return null;
}
