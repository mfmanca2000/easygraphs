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
  | { type: 'axisPoint'; axis: 'x' | 'y'; position: number; elementId?: number };

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

  // Axis points may be associated with an element if they're axis crossings
  if (bp.type === 'axisPoint' && bp.elementId !== undefined) {
    if (bp.elementId >= 0 && bp.elementId < elements.length) {
      return [bp.elementId];
    }
  }

  return [];
}

/**
 * Find a shared element between two boundary points
 */
export function findSharedElement(
  fromPoint: BoundaryPoint,
  toPoint: BoundaryPoint,
  elements: GraphElement[],
  intersections: IntersectionPoint[],
  preferCurves: boolean = false
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

  // Multiple shared elements - choose the most appropriate one
  console.log('[Fill] Multiple shared elements:', sharedElements, preferCurves ? '(PREFER CURVES)' : '(auto)');

  // Calculate both the straight-line distance and path distance
  const fromCoord = resolvePointCoordinates(fromPoint, elements, intersections);
  const toCoord = resolvePointCoordinates(toPoint, elements, intersections);
  const straightLineDistance = distance(fromCoord, toCoord);

  // Calculate the distance along each element between the two points
  let bestElement = sharedElements[0];
  let bestScore = -Infinity;

  for (const elementId of sharedElements) {
    const element = elements[elementId];
    if (!element) continue;

    // Resolve the actual coordinates of the from and to points
    const fromCoord = resolvePointCoordinates(fromPoint, elements, intersections);
    const toCoord = resolvePointCoordinates(toPoint, elements, intersections);

    // Calculate path length along the element
    let pathLength = 0;

    if (element.type === 'bezier' && element.controlPoint) {
      // For bezier curves, sample the curve to estimate length
      const p0 = element.points[0];
      const p2 = element.points[1];
      const p1 = element.controlPoint;
      const curveType = element.curveType || 'quadratic';
      const samples = 50;
      let prevPoint: Point | null = null;

      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        let point: Point;

        if (curveType === 'quadratic') {
          const mt = 1 - t;
          point = {
            x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
            y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
          };
        } else if (curveType === 'cubic' && element.controlPoint2) {
          const p3 = element.controlPoint2;
          const mt = 1 - t;
          const mt2 = mt * mt;
          const mt3 = mt2 * mt;
          const t2 = t * t;
          const t3 = t2 * t;
          point = {
            x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p3.x + t3 * p2.x,
            y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p3.y + t3 * p2.y
          };
        } else if (curveType === 's-curve') {
          const dx = p2.x - p0.x;
          const dy = p2.y - p0.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ctrlDx = p1.x - (p0.x + p2.x) / 2;
          const ctrlDy = p1.y - (p0.y + p2.y) / 2;
          const intensity = dist > 0 ? Math.sqrt(ctrlDx * ctrlDx + ctrlDy * ctrlDy) / dist : 0;

          const cp1x = p0.x + dx * 0.33 + ctrlDy * intensity;
          const cp1y = p0.y + dy * 0.33 - ctrlDx * intensity;
          const cp2x = p0.x + dx * 0.67 - ctrlDy * intensity;
          const cp2y = p0.y + dy * 0.67 + ctrlDx * intensity;

          const mt = 1 - t;
          const mt2 = mt * mt;
          const mt3 = mt2 * mt;
          const t2 = t * t;
          const t3 = t2 * t;
          point = {
            x: mt3 * p0.x + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * p2.x,
            y: mt3 * p0.y + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * p2.y
          };
        } else {
          continue;
        }

        if (prevPoint) {
          pathLength += distance(prevPoint, point);
        }
        prevPoint = point;
      }
    } else {
      // For lines, freehand, and functions - sum distances between consecutive points
      const fromIdx = findClosestPointIndex(fromCoord, element.points);
      const toIdx = findClosestPointIndex(toCoord, element.points);
      const startIdx = Math.min(fromIdx, toIdx);
      const endIdx = Math.max(fromIdx, toIdx);

      for (let i = startIdx; i < endIdx && i < element.points.length - 1; i++) {
        const p1 = element.points[i];
        const p2 = element.points[i + 1];
        pathLength += distance(p1, p2);
      }
    }

    // Score this element based on how reasonable the path is
    // Prefer paths that are close to the straight-line distance
    // Heavily penalize paths that are much longer (going the long way around)
    const ratio = pathLength / straightLineDistance;
    let score = 0;

    const isCurve = element.type === 'bezier' || element.type === 'freehand' || element.type === 'function';
    const isLine = element.type === 'line';

    if (ratio < 1.5) {
      // Path is reasonably direct (less than 1.5x the straight line)
      if (preferCurves && isCurve) {
        // User wants curves - give huge bonus
        score = 1000 + pathLength;
      } else if (preferCurves && isLine) {
        // User wants curves but this is a line - penalize
        score = 10 + pathLength;
      } else if (!preferCurves && isLine) {
        // Default: prefer more direct paths, lines get slight bonus
        score = 100 + pathLength;
      } else {
        // Default: curves are OK too
        score = 90 + pathLength;
      }
    } else if (ratio < 3.0) {
      // Path is somewhat longer but not crazy
      if (preferCurves && isCurve) {
        // User wants curves, still give bonus even if longer
        score = 500 + pathLength / ratio;
      } else {
        score = pathLength / ratio; // Penalize by the ratio
      }
    } else {
      // Path is way too long - probably going the wrong way
      if (preferCurves && isCurve) {
        // User explicitly wants curves, honor that even if very long
        score = 300; // Positive score, but lower than reasonable paths
      } else {
        score = -pathLength; // Negative score
      }
    }

    console.log(`[Fill] Element ${elementId} (${element.type}): path=${pathLength.toFixed(2)}, straight=${straightLineDistance.toFixed(2)}, ratio=${ratio.toFixed(2)}, score=${score.toFixed(2)}`);

    if (score > bestScore) {
      bestScore = score;
      bestElement = elementId;
    }
  }

  console.log('[Fill] Choosing element with best score:', bestElement, 'score:', bestScore.toFixed(2));
  return { id: bestElement };
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
  intersections: IntersectionPoint[],
  preferCurves: boolean = false
): BoundarySegment | null {
  try {
    // Resolve coordinates to verify points exist
    const fromCoord = resolvePointCoordinates(fromPoint, elements, intersections);
    const toCoord = resolvePointCoordinates(toPoint, elements, intersections);

    // Step 1: Check if points share an element (direct path along curve/line)
    const sharedElement = findSharedElement(fromPoint, toPoint, elements, intersections, preferCurves);
    if (sharedElement) {
      const element = elements[sharedElement.id];
      if (element) {
        console.log(`[Fill] Found shared element ${sharedElement.id} (${element.type}) between points`, {
          fromPoint,
          toPoint,
          fromCoord,
          toCoord
        });
        return {
          fromPoint,
          toPoint,
          pathType: 'element',
          elementId: sharedElement.id
        };
      }
    } else {
      console.log('[Fill] No shared element found between points:', {
        fromPoint,
        toPoint,
        fromElements: getAssociatedElements(fromPoint, elements, intersections),
        toElements: getAssociatedElements(toPoint, elements, intersections)
      });
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
 * Find the t parameter (0-1) on a quadratic bezier curve closest to a target point
 */
function findBezierT(
  target: Point,
  p0: Point,
  p1: Point,
  p2: Point,
  curveType: 'quadratic' | 'cubic' | 's-curve',
  p3?: Point
): number {
  // Use sampling to find approximate t
  const samples = 100;
  let minDist = Infinity;
  let bestT = 0;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    let point: Point;

    if (curveType === 'quadratic') {
      // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
      const mt = 1 - t;
      point = {
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
      };
    } else if (curveType === 'cubic' && p3) {
      // Cubic bezier: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;
      point = {
        x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
        y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
      };
    } else {
      // S-curve - treat as cubic with calculated control points
      const dx = p2.x - p0.x;
      const dy = p2.y - p0.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ctrlDx = p1.x - (p0.x + p2.x) / 2;
      const ctrlDy = p1.y - (p0.y + p2.y) / 2;
      const intensity = dist > 0 ? Math.sqrt(ctrlDx * ctrlDx + ctrlDy * ctrlDy) / dist : 0;

      const cp1x = p0.x + dx * 0.33 + ctrlDy * intensity;
      const cp1y = p0.y + dy * 0.33 - ctrlDx * intensity;
      const cp2x = p0.x + dx * 0.67 - ctrlDy * intensity;
      const cp2y = p0.y + dy * 0.67 + ctrlDx * intensity;

      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;
      point = {
        x: mt3 * p0.x + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * p2.x,
        y: mt3 * p0.y + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * p2.y
      };
    }

    const dist = distance(target, point);
    if (dist < minDist) {
      minDist = dist;
      bestT = t;
    }
  }

  return bestT;
}

/**
 * Subdivide a quadratic bezier curve at parameter t
 * Returns the portion of the curve from t1 to t2
 */
function subdivideQuadraticBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  t1: number,
  t2: number
): { start: Point; control: Point; end: Point } {
  // First, get the curve from 0 to t2
  const mt2 = 1 - t2;
  const q0 = p0;
  const q1 = { x: mt2 * p0.x + t2 * p1.x, y: mt2 * p0.y + t2 * p1.y };
  const q2 = { x: mt2 * p1.x + t2 * p2.x, y: mt2 * p1.y + t2 * p2.y };
  const r1 = { x: mt2 * q1.x + t2 * q2.x, y: mt2 * q1.y + t2 * q2.y };
  const endPoint = { x: mt2 * mt2 * p0.x + 2 * mt2 * t2 * p1.x + t2 * t2 * p2.x,
                     y: mt2 * mt2 * p0.y + 2 * mt2 * t2 * p1.y + t2 * t2 * p2.y };

  // Now subdivide from t1 to t2 (adjust t1 to be relative to the 0-t2 curve)
  const adjustedT1 = t1 / t2;
  const mt1 = 1 - adjustedT1;

  const startPoint = {
    x: mt1 * mt1 * q0.x + 2 * mt1 * adjustedT1 * q1.x + adjustedT1 * adjustedT1 * endPoint.x,
    y: mt1 * mt1 * q0.y + 2 * mt1 * adjustedT1 * q1.y + adjustedT1 * adjustedT1 * endPoint.y
  };

  const controlPoint = {
    x: mt1 * q1.x + adjustedT1 * r1.x,
    y: mt1 * q1.y + adjustedT1 * r1.y
  };

  return { start: startPoint, control: controlPoint, end: endPoint };
}

/**
 * Subdivide a cubic bezier curve at parameter t
 * Returns the portion of the curve from t1 to t2
 */
function subdivideCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t1: number,
  t2: number
): { start: Point; control1: Point; control2: Point; end: Point } {
  // First, get the curve from 0 to t2 using De Casteljau
  const mt2 = 1 - t2;
  const q0 = p0;
  const q1 = { x: mt2 * p0.x + t2 * p1.x, y: mt2 * p0.y + t2 * p1.y };
  const q2 = { x: mt2 * p1.x + t2 * p2.x, y: mt2 * p1.y + t2 * p2.y };
  const q3 = { x: mt2 * p2.x + t2 * p3.x, y: mt2 * p2.y + t2 * p3.y };
  const r1 = { x: mt2 * q1.x + t2 * q2.x, y: mt2 * q1.y + t2 * q2.y };
  const r2 = { x: mt2 * q2.x + t2 * q3.x, y: mt2 * q2.y + t2 * q3.y };
  const s1 = { x: mt2 * r1.x + t2 * r2.x, y: mt2 * r1.y + t2 * r2.y };

  // Calculate the end point on the full curve at t2
  const mt2_3 = mt2 * mt2 * mt2;
  const t2_3 = t2 * t2 * t2;
  const endPoint = {
    x: mt2_3 * p0.x + 3 * mt2 * mt2 * t2 * p1.x + 3 * mt2 * t2 * t2 * p2.x + t2_3 * p3.x,
    y: mt2_3 * p0.y + 3 * mt2 * mt2 * t2 * p1.y + 3 * mt2 * t2 * t2 * p2.y + t2_3 * p3.y
  };

  // Now subdivide from t1 to t2 (adjust t1 to be relative to the 0-t2 curve)
  const adjustedT1 = t1 / t2;
  const mt1 = 1 - adjustedT1;

  const startPoint = {
    x: mt1 * mt1 * mt1 * q0.x + 3 * mt1 * mt1 * adjustedT1 * q1.x + 3 * mt1 * adjustedT1 * adjustedT1 * r1.x + adjustedT1 * adjustedT1 * adjustedT1 * endPoint.x,
    y: mt1 * mt1 * mt1 * q0.y + 3 * mt1 * mt1 * adjustedT1 * q1.y + 3 * mt1 * adjustedT1 * adjustedT1 * r1.y + adjustedT1 * adjustedT1 * adjustedT1 * endPoint.y
  };

  const control1 = {
    x: mt1 * q1.x + adjustedT1 * r1.x,
    y: mt1 * q1.y + adjustedT1 * r1.y
  };

  const control2 = {
    x: mt1 * r1.x + adjustedT1 * s1.x,
    y: mt1 * r1.y + adjustedT1 * s1.y
  };

  return { start: startPoint, control1, control2, end: endPoint };
}

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
    // For bezier curves, subdivide to trace only the portion between the two points
    if (element.points.length < 2 || !element.controlPoint) {
      // Fallback to straight line if invalid
      const toCanvas = graphToCanvas(toPoint.x, toPoint.y);
      ctx.lineTo(toCanvas.x, toCanvas.y);
      return;
    }

    const p0 = element.points[0];
    const p2 = element.points[1];
    const p1 = element.controlPoint;
    const curveType = element.curveType || 'quadratic';

    // Find t parameters for from and to points
    let t1: number, t2: number;

    if (curveType === 'cubic' && element.controlPoint2) {
      const p3 = element.controlPoint2;
      t1 = findBezierT(fromPoint, p0, p1, p3, 'cubic', p2);
      t2 = findBezierT(toPoint, p0, p1, p3, 'cubic', p2);
    } else if (curveType === 's-curve') {
      t1 = findBezierT(fromPoint, p0, p1, p2, 's-curve');
      t2 = findBezierT(toPoint, p0, p1, p2, 's-curve');
    } else {
      // Quadratic
      t1 = findBezierT(fromPoint, p0, p1, p2, 'quadratic');
      t2 = findBezierT(toPoint, p0, p1, p2, 'quadratic');
    }

    // Determine which direction to trace along the curve
    const shortPathLength = Math.abs(t2 - t1);
    const longPathLength = 1.0 - shortPathLength;

    // Always take the shorter path, but preserve the direction (from t1 to t2)
    if (shortPathLength > 0.5) {
      // The "short path" from t1 to t2 is actually > 0.5, which means
      // we should go the other way around the curve
      // Reverse by going from t2 toward t1 but wrapping around
      // For now, fall back to full curve tracing
      const goForward = isCloserToStart(fromPoint, element);
      if (goForward) {
        traceBezierForward(ctx, element, graphToCanvas);
      } else {
        traceBezierBackward(ctx, element, graphToCanvas);
      }
      return;
    }

    // If t1 > t2, we need to trace backward
    const needsReverse = t1 > t2;
    if (needsReverse) {
      // Swap for subdivision, but we'll trace it backward
      [t1, t2] = [t2, t1];
    }

    // Trace the subdivided portion from t1 to t2
    if (curveType === 'cubic' && element.controlPoint2) {
      // Cubic bezier
      const dx = p2.x - p0.x;
      const dy = p2.y - p0.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ctrlDx = p1.x - (p0.x + p2.x) / 2;
      const ctrlDy = p1.y - (p0.y + p2.y) / 2;
      const intensity = dist > 0 ? Math.sqrt(ctrlDx * ctrlDx + ctrlDy * ctrlDy) / dist : 0;

      const cp1x = p0.x + dx * 0.33 + ctrlDy * intensity;
      const cp1y = p0.y + dy * 0.33 - ctrlDx * intensity;
      const cp2x = p0.x + dx * 0.67 - ctrlDy * intensity;
      const cp2y = p0.y + dy * 0.67 + ctrlDx * intensity;

      const subdivided = subdivideCubicBezier(
        p0,
        { x: cp1x, y: cp1y },
        { x: cp2x, y: cp2y },
        p2,
        t1,
        t2
      );

      if (needsReverse) {
        // We swapped t1/t2, so trace from subdivided.end to subdivided.start
        // Reverse the control points too
        const control2Canvas = graphToCanvas(subdivided.control2.x, subdivided.control2.y);
        const control1Canvas = graphToCanvas(subdivided.control1.x, subdivided.control1.y);
        const startCanvas = graphToCanvas(subdivided.start.x, subdivided.start.y);

        ctx.bezierCurveTo(
          control2Canvas.x, control2Canvas.y,
          control1Canvas.x, control1Canvas.y,
          startCanvas.x, startCanvas.y
        );
      } else {
        const control1Canvas = graphToCanvas(subdivided.control1.x, subdivided.control1.y);
        const control2Canvas = graphToCanvas(subdivided.control2.x, subdivided.control2.y);
        const endCanvas = graphToCanvas(subdivided.end.x, subdivided.end.y);

        ctx.bezierCurveTo(
          control1Canvas.x, control1Canvas.y,
          control2Canvas.x, control2Canvas.y,
          endCanvas.x, endCanvas.y
        );
      }
    } else if (curveType === 's-curve') {
      // S-curve
      const dx = p2.x - p0.x;
      const dy = p2.y - p0.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ctrlDx = p1.x - (p0.x + p2.x) / 2;
      const ctrlDy = p1.y - (p0.y + p2.y) / 2;
      const intensity = dist > 0 ? Math.sqrt(ctrlDx * ctrlDx + ctrlDy * ctrlDy) / dist : 0;

      const cp1x = p0.x + dx * 0.33 + ctrlDy * intensity;
      const cp1y = p0.y + dy * 0.33 - ctrlDx * intensity;
      const cp2x = p0.x + dx * 0.67 - ctrlDy * intensity;
      const cp2y = p0.y + dy * 0.67 + ctrlDx * intensity;

      const subdivided = subdivideCubicBezier(
        p0,
        { x: cp1x, y: cp1y },
        { x: cp2x, y: cp2y },
        p2,
        t1,
        t2
      );

      if (needsReverse) {
        // We swapped t1/t2, so trace from subdivided.end to subdivided.start
        const control2Canvas = graphToCanvas(subdivided.control2.x, subdivided.control2.y);
        const control1Canvas = graphToCanvas(subdivided.control1.x, subdivided.control1.y);
        const startCanvas = graphToCanvas(subdivided.start.x, subdivided.start.y);

        ctx.bezierCurveTo(
          control2Canvas.x, control2Canvas.y,
          control1Canvas.x, control1Canvas.y,
          startCanvas.x, startCanvas.y
        );
      } else {
        const control1Canvas = graphToCanvas(subdivided.control1.x, subdivided.control1.y);
        const control2Canvas = graphToCanvas(subdivided.control2.x, subdivided.control2.y);
        const endCanvas = graphToCanvas(subdivided.end.x, subdivided.end.y);

        ctx.bezierCurveTo(
          control1Canvas.x, control1Canvas.y,
          control2Canvas.x, control2Canvas.y,
          endCanvas.x, endCanvas.y
        );
      }
    } else {
      // Quadratic bezier
      const subdivided = subdivideQuadraticBezier(p0, p1, p2, t1, t2);

      if (needsReverse) {
        // We swapped t1/t2 during subdivision
        // subdivided.start corresponds to the original t2 (our target)
        // subdivided.end corresponds to the original t1 (where we are now)
        // Canvas cursor is near subdivided.end, we need to draw to subdivided.start
        const controlCanvas = graphToCanvas(subdivided.control.x, subdivided.control.y);
        const startCanvas = graphToCanvas(subdivided.start.x, subdivided.start.y);
        ctx.quadraticCurveTo(controlCanvas.x, controlCanvas.y, startCanvas.x, startCanvas.y);
      } else {
        const controlCanvas = graphToCanvas(subdivided.control.x, subdivided.control.y);
        const endCanvas = graphToCanvas(subdivided.end.x, subdivided.end.y);
        ctx.quadraticCurveTo(controlCanvas.x, controlCanvas.y, endCanvas.x, endCanvas.y);
      }
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
  try {
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
  } catch (error) {
    console.warn('[traceSegmentForFill] Error tracing segment, skipping:', error);
    // Continue to next segment
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
  // Validate the fill area first
  if (!validateFillArea(fillArea, elements, intersections)) {
    console.warn('[renderFillArea] Fill area is invalid, skipping render:', fillArea.id);
    return;
  }

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
