// Fill area utilities for boundary-based fills

import type { Point, GraphElement } from '@/app/types/canvas';
import type { IntersectionPoint } from '@/app/types/canvas/elements';
import { distance } from './geometry';

/**
 * Identifies a point in the graph that can be used as a boundary vertex
 */
export type BoundaryPoint =
  | { type: 'intersection'; intersectionIndex: number }
  | { type: 'elementPoint'; elementId: number; pointIndex: number }
  | { type: 'axisPoint'; axis: 'x' | 'y'; position: number };

/**
 * Represents a traced path between two boundary points
 */
export interface BoundarySegment {
  fromPoint: BoundaryPoint;
  toPoint: BoundaryPoint;
  pathType: 'element' | 'projection' | 'axis';
  elementId?: number; // if pathType is 'element'
  axis?: 'x' | 'y';   // if pathType is 'axis' or 'projection'
}

/**
 * New fill area interface using boundary points
 */
export interface FillArea {
  id: string;
  boundaryPoints: BoundaryPoint[];  // ordered vertices
  color: string;
  opacity: number;  // 0-1, default 0.3
  segments?: BoundarySegment[];  // cached path segments
}

/**
 * Resolve a boundary point to its graph coordinates
 */
export function resolvePointCoordinates(
  bp: BoundaryPoint,
  elements: GraphElement[],
  intersections: IntersectionPoint[]
): Point {
  let point: Point;

  if (bp.type === 'intersection') {
    if (bp.intersectionIndex < 0 || bp.intersectionIndex >= intersections.length) {
      throw new Error(`Invalid intersection index: ${bp.intersectionIndex}`);
    }
    point = intersections[bp.intersectionIndex].point;
  } else if (bp.type === 'elementPoint') {
    if (bp.elementId < 0 || bp.elementId >= elements.length) {
      throw new Error(`Invalid element ID: ${bp.elementId}`);
    }
    const element = elements[bp.elementId];
    if (bp.pointIndex < 0 || bp.pointIndex >= element.points.length) {
      throw new Error(`Invalid point index: ${bp.pointIndex}`);
    }
    point = element.points[bp.pointIndex];
  } else if (bp.type === 'axisPoint') {
    point = bp.axis === 'x'
      ? { x: bp.position, y: 0 }
      : { x: 0, y: bp.position };
  } else {
    throw new Error('Unknown boundary point type');
  }

  // Validate coordinates are finite numbers
  if (!isFinite(point.x) || !isFinite(point.y)) {
    throw new Error(`Invalid coordinates: (${point.x}, ${point.y})`);
  }

  return point;
}

/**
 * Get element IDs associated with a boundary point
 */
export function getAssociatedElements(
  bp: BoundaryPoint,
  elements: GraphElement[],
  intersections: IntersectionPoint[]
): number[] {
  if (bp.type === 'intersection') {
    if (bp.intersectionIndex < 0 || bp.intersectionIndex >= intersections.length) {
      return [];
    }
    const intersection = intersections[bp.intersectionIndex];
    return [intersection.elementId1, intersection.elementId2];
  }

  if (bp.type === 'elementPoint') {
    if (bp.elementId < 0 || bp.elementId >= elements.length) {
      return [];
    }
    return [bp.elementId];
  }

  // Axis points are not associated with elements
  return [];
}

/**
 * Find a shared element between two boundary points
 */
export function findSharedElement(
  fromPoint: BoundaryPoint,
  toPoint: BoundaryPoint,
  elements: GraphElement[],
  intersections: IntersectionPoint[]
): { id: number } | null {
  const fromElements = getAssociatedElements(fromPoint, elements, intersections);
  const toElements = getAssociatedElements(toPoint, elements, intersections);

  console.log('[Fill] findSharedElement:', {
    fromPoint: fromPoint.type,
    toPoint: toPoint.type,
    fromElements: fromElements,
    toElements: toElements,
    fromPointDetails: fromPoint,
    toPointDetails: toPoint
  });

  // Find ALL common elements
  const sharedElements = fromElements.filter(id => toElements.includes(id));

  if (sharedElements.length === 0) {
    console.log('[Fill] No shared element found - fromElements:', fromElements, 'toElements:', toElements);
    return null;
  }

  if (sharedElements.length === 1) {
    console.log('[Fill] Found shared element:', sharedElements[0]);
    return { id: sharedElements[0] };
  }

  // Multiple shared elements - prefer lines over curves (lines are shorter/more direct)
  console.log('[Fill] Multiple shared elements:', sharedElements);
  for (const elementId of sharedElements) {
    const element = elements[elementId];
    if (element && element.type === 'line') {
      console.log('[Fill] Choosing line element:', elementId);
      return { id: elementId };
    }
  }

  // If no line, just use the first one
  console.log('[Fill] No line found, using first shared element:', sharedElements[0]);
  return { id: sharedElements[0] };
}

/**
 * Check if a point is closer to the start of an element
 */
export function isCloserToStart(point: Point, element: GraphElement): boolean {
  if (element.points.length === 0) return true;
  if (element.points.length === 1) return true;

  const startDist = distance(point, element.points[0]);
  const endDist = distance(point, element.points[element.points.length - 1]);

  return startDist <= endDist;
}

/**
 * Find the closest point index in an array of points
 */
export function findClosestPointIndex(target: Point, points: Point[]): number {
  if (points.length === 0) return 0;

  let minDist = Infinity;
  let minIndex = 0;

  for (let i = 0; i < points.length; i++) {
    const dist = distance(target, points[i]);
    if (dist < minDist) {
      minDist = dist;
      minIndex = i;
    }
  }

  return minIndex;
}

/**
 * Check if a point is on a projection line from an intersection
 */
function isPointOnProjection(
  point: BoundaryPoint,
  intersection: IntersectionPoint,
  axis: 'x' | 'y',
  elements: GraphElement[],
  intersections: IntersectionPoint[]
): boolean {
  const THRESHOLD = 0.01; // Graph units

  try {
    const pointCoord = resolvePointCoordinates(point, elements, intersections);
    const intCoord = intersection.point;

    if (axis === 'x') {
      // Vertical projection: check if x matches and y is at axis (y=0)
      return Math.abs(pointCoord.x - intCoord.x) < THRESHOLD &&
             Math.abs(pointCoord.y) < THRESHOLD;
    } else {
      // Horizontal projection: check if y matches and x is at axis (x=0)
      return Math.abs(pointCoord.y - intCoord.y) < THRESHOLD &&
             Math.abs(pointCoord.x) < THRESHOLD;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Find projection path between two points
 */
function findProjectionPath(
  fromPoint: BoundaryPoint,
  toPoint: BoundaryPoint,
  elements: GraphElement[],
  intersections: IntersectionPoint[]
): BoundarySegment | null {
  // Check if fromPoint is an intersection with showProjection enabled
  if (fromPoint.type === 'intersection') {
    const intersection = intersections[fromPoint.intersectionIndex];
    if (intersection && intersection.showProjection) {
      // Determine projection axis (always vertical for now, projecting to x-axis)
      const projectionAxis: 'x' = 'x';

      // Check if toPoint is on the projection line
      if (isPointOnProjection(toPoint, intersection, projectionAxis, elements, intersections)) {
        return {
          fromPoint,
          toPoint,
          pathType: 'projection',
          axis: projectionAxis
        };
      }
    }
  }

  // Check if toPoint is an intersection with showProjection enabled
  if (toPoint.type === 'intersection') {
    const intersection = intersections[toPoint.intersectionIndex];
    if (intersection && intersection.showProjection) {
      // Determine projection axis
      const projectionAxis: 'x' = 'x';

      // Check if fromPoint is on the projection line
      if (isPointOnProjection(fromPoint, intersection, projectionAxis, elements, intersections)) {
        return {
          fromPoint,
          toPoint,
          pathType: 'projection',
          axis: projectionAxis
        };
      }
    }
  }

  return null;
}

/**
 * Find axis path between two points
 */
function findAxisPath(
  fromCoord: Point,
  toCoord: Point,
  fromPoint: BoundaryPoint,
  toPoint: BoundaryPoint
): BoundarySegment | null {
  const AXIS_THRESHOLD = 0.01; // Graph units

  // Both on X-axis
  if (Math.abs(fromCoord.y) < AXIS_THRESHOLD && Math.abs(toCoord.y) < AXIS_THRESHOLD) {
    return {
      fromPoint,
      toPoint,
      pathType: 'axis',
      axis: 'x'
    };
  }

  // Both on Y-axis
  if (Math.abs(fromCoord.x) < AXIS_THRESHOLD && Math.abs(toCoord.x) < AXIS_THRESHOLD) {
    return {
      fromPoint,
      toPoint,
      pathType: 'axis',
      axis: 'y'
    };
  }

  return null;
}

/**
 * Trace boundary path between two points
 * Returns a segment or null if no valid path found
 */
export function traceBoundaryPath(
  fromPoint: BoundaryPoint,
  toPoint: BoundaryPoint,
  elements: GraphElement[],
  intersections: IntersectionPoint[]
): BoundarySegment | null {
  try {
    // Resolve coordinates to verify points exist
    const fromCoord = resolvePointCoordinates(fromPoint, elements, intersections);
    const toCoord = resolvePointCoordinates(toPoint, elements, intersections);

    // Step 1: Check if points share an element (direct path along curve/line)
    const sharedElement = findSharedElement(fromPoint, toPoint, elements, intersections);
    if (sharedElement) {
      const element = elements[sharedElement.id];
      if (element) {
        console.log(`[Fill] Found shared element ${sharedElement.id} (${element.type}) between points`);
        return {
          fromPoint,
          toPoint,
          pathType: 'element',
          elementId: sharedElement.id
        };
      }
    }

    // Step 2: Check if connected via projection
    const projectionPath = findProjectionPath(fromPoint, toPoint, elements, intersections);
    if (projectionPath) {
      console.log('[Fill] Using projection path');
      return projectionPath;
    }

    // Step 3: Check if connected via axis
    const axisPath = findAxisPath(fromCoord, toCoord, fromPoint, toPoint);
    if (axisPath) {
      console.log('[Fill] Using axis path');
      return axisPath;
    }

    // Step 4: Smart fallback - if one point is an intersection and the other is on an axis,
    // try to trace along the curve to the axis
    // This handles both directions: intersection ↔ axis point
    if ((fromPoint.type === 'intersection' && toPoint.type === 'axisPoint') ||
        (fromPoint.type === 'axisPoint' && toPoint.type === 'intersection')) {

      // Determine which point is the intersection and which is the axis
      const intersectionPoint = fromPoint.type === 'intersection' ? fromPoint : toPoint;
      const axisPoint = fromPoint.type === 'axisPoint' ? fromPoint : toPoint;
      const axisCoord = fromPoint.type === 'axisPoint' ? fromCoord : toCoord;

      // TypeScript type guard - ensure axisPoint is actually an axisPoint
      if (axisPoint.type !== 'axisPoint') return null;

      console.log('[Fill] Smart trace: Checking intersection ↔ axisPoint connection');
      console.log('[Fill] axisCoord:', axisCoord, 'axisPoint.axis:', axisPoint.axis, 'axisPoint.position:', axisPoint.position);

      const intersectionElements = getAssociatedElements(intersectionPoint, elements, intersections);
      console.log('[Fill] intersectionElements:', intersectionElements);

      // Check if any element from the intersection can reach the axis point
      for (const elementId of intersectionElements) {
        const element = elements[elementId];
        console.log(`[Fill] Checking element ${elementId}, type: ${element?.type}, points count: ${element?.points?.length}`);

        if (element) {
          // Check if this element's points are near the axis
          const AXIS_THRESHOLD = 0.1;
          const POSITION_THRESHOLD = 0.5;

          for (let i = 0; i < element.points.length; i++) {
            const pt = element.points[i];

            if (axisPoint.axis === 'x') {
              // Checking if point is on x-axis (y ≈ 0) and close to the clicked x position
              const onXAxis = Math.abs(pt.y) < AXIS_THRESHOLD;
              const nearPosition = Math.abs(pt.x - axisCoord.x) < POSITION_THRESHOLD;

              if (i % 10 === 0 || (onXAxis && nearPosition)) { // Log every 10th point or matches
                console.log(`[Fill]   Point ${i}: (${pt.x.toFixed(3)}, ${pt.y.toFixed(3)}) - onXAxis: ${onXAxis}, nearPosition: ${nearPosition} (dist: ${Math.abs(pt.x - axisCoord.x).toFixed(3)})`);
              }

              if (onXAxis && nearPosition) {
                console.log(`[Fill] ✓ Smart trace: Following element ${elementId} between intersection and axis point on x-axis`);
                return {
                  fromPoint,
                  toPoint,
                  pathType: 'element',
                  elementId: elementId
                };
              }
            } else if (axisPoint.axis === 'y') {
              // Checking if point is on y-axis (x ≈ 0) and close to the clicked y position
              const onYAxis = Math.abs(pt.x) < AXIS_THRESHOLD;
              const nearPosition = Math.abs(pt.y - axisCoord.y) < POSITION_THRESHOLD;

              if (i % 10 === 0 || (onYAxis && nearPosition)) {
                console.log(`[Fill]   Point ${i}: (${pt.x.toFixed(3)}, ${pt.y.toFixed(3)}) - onYAxis: ${onYAxis}, nearPosition: ${nearPosition} (dist: ${Math.abs(pt.y - axisCoord.y).toFixed(3)})`);
              }

              if (onYAxis && nearPosition) {
                console.log(`[Fill] ✓ Smart trace: Following element ${elementId} between intersection and axis point on y-axis`);
                return {
                  fromPoint,
                  toPoint,
                  pathType: 'element',
                  elementId: elementId
                };
              }
            }
          }
          console.log(`[Fill] No matching axis point found on element ${elementId}`);
        }
      }
      console.log('[Fill] Smart trace failed - no element connects intersection to axis point');
    }

    // Step 5: Fallback - create a straight line segment between any two points
    // This allows connecting axis points, intersections, and element points
    // even when they don't share an element or axis
    console.log('[Fill] Using fallback straight line between points');
    return {
      fromPoint,
      toPoint,
      pathType: 'axis', // Reuse 'axis' type for straight lines
      axis: 'x' // Dummy axis value (not used for rendering straight lines)
    };
  } catch (error) {
    console.warn('Error tracing boundary path:', error);
    return null;
  }
}

/**
 * Compute segments for a fill area (cache for performance)
 */
export function computeSegments(
  boundaryPoints: BoundaryPoint[],
  elements: GraphElement[],
  intersections: IntersectionPoint[]
): BoundarySegment[] {
  const segments: BoundarySegment[] = [];

  if (boundaryPoints.length < 3) {
    return segments; // Need at least 3 points to form a closed area
  }

  // Trace path between each consecutive pair of points
  for (let i = 0; i < boundaryPoints.length; i++) {
    const fromPoint = boundaryPoints[i];
    const toPoint = boundaryPoints[(i + 1) % boundaryPoints.length]; // Wrap around to close

    const segment = traceBoundaryPath(fromPoint, toPoint, elements, intersections);
    if (segment) {
      segments.push(segment);
    } else {
      console.warn('Could not trace path between points', i, 'and', (i + 1) % boundaryPoints.length);
    }
  }

  return segments;
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Validate that a fill area is still valid (all referenced elements exist)
 */
export function validateFillArea(
  fillArea: FillArea,
  elements: GraphElement[],
  intersections: IntersectionPoint[]
): boolean {
  try {
    for (const bp of fillArea.boundaryPoints) {
      // This will throw if the point is invalid
      resolvePointCoordinates(bp, elements, intersections);
    }
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================

type GraphToCanvasFunc = (x: number, y: number) => Point;

/**
 * Trace a bezier curve path forward (from start to end)
 */
function traceBezierForward(
  ctx: CanvasRenderingContext2D,
  element: GraphElement,
  graphToCanvas: GraphToCanvasFunc
): void {
  if (element.points.length < 2 || !element.controlPoint) return;

  const start = graphToCanvas(element.points[0].x, element.points[0].y);
  const end = graphToCanvas(element.points[1].x, element.points[1].y);
  const control = graphToCanvas(element.controlPoint.x, element.controlPoint.y);

  const curveType = element.curveType || 'quadratic';

  if (curveType === 'quadratic') {
    ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
  } else if (curveType === 'cubic' && element.controlPoint2) {
    const control2 = graphToCanvas(element.controlPoint2.x, element.controlPoint2.y);
    ctx.bezierCurveTo(control.x, control.y, control2.x, control2.y, end.x, end.y);
  } else if (curveType === 's-curve') {
    // S-curve: calculate two control points for smooth S-shape
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const ctrlDx = control.x - (start.x + end.x) / 2;
    const ctrlDy = control.y - (start.y + end.y) / 2;
    const intensity = dist > 0 ? Math.sqrt(ctrlDx * ctrlDx + ctrlDy * ctrlDy) / dist : 0;

    const cp1x = start.x + dx * 0.33 + ctrlDy * intensity;
    const cp1y = start.y + dy * 0.33 - ctrlDx * intensity;
    const cp2x = start.x + dx * 0.67 - ctrlDy * intensity;
    const cp2y = start.y + dy * 0.67 + ctrlDx * intensity;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
  }
}

/**
 * Trace a bezier curve path backward (from end to start)
 */
function traceBezierBackward(
  ctx: CanvasRenderingContext2D,
  element: GraphElement,
  graphToCanvas: GraphToCanvasFunc
): void {
  if (element.points.length < 2 || !element.controlPoint) return;

  const start = graphToCanvas(element.points[0].x, element.points[0].y);
  const end = graphToCanvas(element.points[1].x, element.points[1].y);
  const control = graphToCanvas(element.controlPoint.x, element.controlPoint.y);

  const curveType = element.curveType || 'quadratic';

  if (curveType === 'quadratic') {
    // For quadratic, swap direction: end -> control -> start
    ctx.quadraticCurveTo(control.x, control.y, start.x, start.y);
  } else if (curveType === 'cubic' && element.controlPoint2) {
    // For cubic, swap direction and control points: end -> control2 -> control -> start
    const control2 = graphToCanvas(element.controlPoint2.x, element.controlPoint2.y);
    ctx.bezierCurveTo(control2.x, control2.y, control.x, control.y, start.x, start.y);
  } else if (curveType === 's-curve') {
    // S-curve backward: swap control points
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const ctrlDx = control.x - (start.x + end.x) / 2;
    const ctrlDy = control.y - (start.y + end.y) / 2;
    const intensity = dist > 0 ? Math.sqrt(ctrlDx * ctrlDx + ctrlDy * ctrlDy) / dist : 0;

    const cp1x = start.x + dx * 0.33 + ctrlDy * intensity;
    const cp1y = start.y + dy * 0.33 - ctrlDx * intensity;
    const cp2x = start.x + dx * 0.67 - ctrlDy * intensity;
    const cp2y = start.y + dy * 0.67 + ctrlDx * intensity;

    // Swap control points for backward
    ctx.bezierCurveTo(cp2x, cp2y, cp1x, cp1y, start.x, start.y);
  }
}

/**
 * Trace a freehand/function path between two points
 */
function traceFreehandPath(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  startIndex: number,
  endIndex: number,
  graphToCanvas: GraphToCanvasFunc
): void {
  if (points.length === 0) return;

  const start = Math.min(startIndex, endIndex);
  const end = Math.max(startIndex, endIndex);
  const forward = startIndex <= endIndex;

  const indices: number[] = [];
  for (let i = start; i <= end; i++) {
    indices.push(i);
  }

  if (!forward) {
    indices.reverse();
  }

  // Trace points with lineTo
  for (const i of indices) {
    if (i >= 0 && i < points.length) {
      const canvasPoint = graphToCanvas(points[i].x, points[i].y);
      ctx.lineTo(canvasPoint.x, canvasPoint.y);
    }
  }
}

/**
 * Trace along an element's path between two points
 */
function traceElementPath(
  ctx: CanvasRenderingContext2D,
  element: GraphElement,
  fromPoint: Point,
  toPoint: Point,
  graphToCanvas: GraphToCanvasFunc
): void {
  if (element.type === 'line') {
    // Simple line - just lineTo
    const toCanvas = graphToCanvas(toPoint.x, toPoint.y);
    ctx.lineTo(toCanvas.x, toCanvas.y);
  } else if (element.type === 'bezier') {
    // For bezier curves, trace the entire curve based on direction
    // Note: Ideally we would trace only the portion between the two points,
    // but that requires subdividing the bezier curve, which is complex.
    // For now, trace the full curve and accept that fills may not be perfect.
    const goForward = isCloserToStart(fromPoint, element);

    if (goForward) {
      traceBezierForward(ctx, element, graphToCanvas);
    } else {
      traceBezierBackward(ctx, element, graphToCanvas);
    }
  } else if (element.type === 'freehand' || element.type === 'function') {
    // Find segment range and trace with lineTo
    const startIndex = findClosestPointIndex(fromPoint, element.points);
    const endIndex = findClosestPointIndex(toPoint, element.points);

    if (startIndex === endIndex) {
      // Same index - draw straight line to the actual intersection point
      // This handles the case where both points map to the same curve point
      const toCanvas = graphToCanvas(toPoint.x, toPoint.y);
      ctx.lineTo(toCanvas.x, toCanvas.y);
    } else {
      // Different indices - trace along the curve
      traceFreehandPath(ctx, element.points, startIndex, endIndex, graphToCanvas);
    }
  }
}

/**
 * Trace a boundary segment for filling
 */
function traceSegmentForFill(
  ctx: CanvasRenderingContext2D,
  segment: BoundarySegment,
  elements: GraphElement[],
  intersections: IntersectionPoint[],
  graphToCanvas: GraphToCanvasFunc
): void {
  if (segment.pathType === 'element' && segment.elementId !== undefined) {
    const element = elements[segment.elementId];
    if (!element) {
      return;
    }

    const fromCoord = resolvePointCoordinates(segment.fromPoint, elements, intersections);
    const toCoord = resolvePointCoordinates(segment.toPoint, elements, intersections);

    // Trace along the element's curve/line
    traceElementPath(ctx, element, fromCoord, toCoord, graphToCanvas);
  } else if (segment.pathType === 'projection' || segment.pathType === 'axis') {
    // Straight line for projections and axis segments
    const toCoord = resolvePointCoordinates(segment.toPoint, elements, intersections);
    const toCanvas = graphToCanvas(toCoord.x, toCoord.y);
    ctx.lineTo(toCanvas.x, toCanvas.y);
  }
}

/**
 * Render a fill area
 *
 * Note: Fill areas that reference intersection points by index may become invalid
 * if intersections are recalculated (e.g., after elements are modified). The cached
 * segments are cleared when element IDs change due to deletion, but not when
 * intersection coordinates change. This is acceptable as the fill will simply not
 * render correctly and can be deleted/recreated by the user.
 */
export function renderFillArea(
  ctx: CanvasRenderingContext2D,
  fillArea: FillArea,
  elements: GraphElement[],
  intersections: IntersectionPoint[],
  graphToCanvas: GraphToCanvasFunc
): void {
  // Ensure we have cached segments
  if (!fillArea.segments || fillArea.segments.length === 0) {
    fillArea.segments = computeSegments(fillArea.boundaryPoints, elements, intersections);
  }

  if (fillArea.segments.length === 0) {
    return;
  }

  ctx.save();
  ctx.fillStyle = fillArea.color;
  ctx.globalAlpha = fillArea.opacity;

  ctx.beginPath();

  // Start at first point
  try {
    const firstPoint = resolvePointCoordinates(fillArea.boundaryPoints[0], elements, intersections);
    const firstCanvas = graphToCanvas(firstPoint.x, firstPoint.y);
    ctx.moveTo(firstCanvas.x, firstCanvas.y);

    // Trace each segment
    for (let i = 0; i < fillArea.segments.length; i++) {
      const segment = fillArea.segments[i];
      traceSegmentForFill(ctx, segment, elements, intersections, graphToCanvas);
    }

    ctx.closePath();
    ctx.fill();
  } catch (error) {
    console.error('[renderFillArea] Error rendering fill area:', error);
  }

  ctx.restore();
}

/**
 * Find a clicked fill area
 */
export function findClickedFillArea(
  clickPoint: Point,
  fillAreas: FillArea[],
  elements: GraphElement[],
  intersections: IntersectionPoint[]
): number | null {
  // Check each fill area using point-in-polygon test (reverse order for top-most)
  for (let i = fillAreas.length - 1; i >= 0; i--) {
    const fillArea = fillAreas[i];

    try {
      const vertices = fillArea.boundaryPoints.map(bp =>
        resolvePointCoordinates(bp, elements, intersections)
      );

      if (isPointInPolygon(clickPoint, vertices)) {
        return i;
      }
    } catch (error) {
      // Skip invalid fill areas
      continue;
    }
  }

  return null;
}

/**
 * Draw boundary editor handles for a fill area
 */
export function drawBoundaryEditor(
  ctx: CanvasRenderingContext2D,
  fillArea: FillArea,
  elements: GraphElement[],
  intersections: IntersectionPoint[],
  graphToCanvas: GraphToCanvasFunc,
  hoveredVertexIndex: number | null,
  selectedVertexIndex: number | null
): void {
  try {
    // Draw handles at each boundary point
    fillArea.boundaryPoints.forEach((bp, index) => {
      const coord = resolvePointCoordinates(bp, elements, intersections);
      const canvas = graphToCanvas(coord.x, coord.y);

      ctx.save();

      // Determine handle appearance
      const isHovered = hoveredVertexIndex === index;
      const isSelected = selectedVertexIndex === index;

      // Draw handle circle
      ctx.beginPath();
      ctx.arc(canvas.x, canvas.y, isHovered || isSelected ? 8 : 6, 0, 2 * Math.PI);

      if (isSelected) {
        ctx.fillStyle = '#3498db'; // Blue for selected
        ctx.strokeStyle = '#2980b9';
      } else if (isHovered) {
        ctx.fillStyle = '#f39c12'; // Orange for hovered
        ctx.strokeStyle = '#e67e22';
      } else {
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#3498db';
      }

      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Draw vertex number
      ctx.fillStyle = isSelected || isHovered ? 'white' : '#3498db';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), canvas.x, canvas.y);

      ctx.restore();
    });
  } catch (error) {
    console.error('Error drawing boundary editor:', error);
  }
}

/**
 * Find boundary vertex near click point
 */
export function findClickedBoundaryVertex(
  clickCanvas: Point,
  fillArea: FillArea,
  elements: GraphElement[],
  intersections: IntersectionPoint[],
  graphToCanvas: GraphToCanvasFunc,
  threshold: number = 10
): number | null {
  try {
    for (let i = 0; i < fillArea.boundaryPoints.length; i++) {
      const bp = fillArea.boundaryPoints[i];
      const coord = resolvePointCoordinates(bp, elements, intersections);
      const canvas = graphToCanvas(coord.x, coord.y);

      const dist = Math.sqrt(
        Math.pow(canvas.x - clickCanvas.x, 2) + Math.pow(canvas.y - clickCanvas.y, 2)
      );

      if (dist < threshold) {
        return i;
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return null;
}
