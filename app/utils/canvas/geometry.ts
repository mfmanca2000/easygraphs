// Geometric calculations and distance functions

import type { Point, GraphElement } from '@/app/types/canvas';

/**
 * Calculate distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Check if a point is near a line segment
 */
export function isPointNearLine(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  threshold: number = 10
): boolean {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

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
}

/**
 * Check if two line segments intersect
 */
export function lineSegmentsIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false; // parallel

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/**
 * Find intersection point of two line segments
 */
export function lineIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
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
}

/**
 * Get line segments from a graph element
 */
export function getElementSegments(element: GraphElement): Array<{ start: Point; end: Point }> {
  const segments: Array<{ start: Point; end: Point }> = [];

  if (element.type === 'line' && element.points.length === 2) {
    segments.push({
      start: element.points[0],
      end: element.points[1]
    });
  } else if (element.type === 'freehand' || element.type === 'function') {
    for (let i = 0; i < element.points.length - 1; i++) {
      segments.push({
        start: element.points[i],
        end: element.points[i + 1]
      });
    }
  }

  return segments;
}

/**
 * Calculate bounding box for a set of points
 */
export function getBoundingBox(points: Point[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  return points.reduce((box, point) => ({
    minX: Math.min(box.minX, point.x),
    maxX: Math.max(box.maxX, point.x),
    minY: Math.min(box.minY, point.y),
    maxY: Math.max(box.maxY, point.y)
  }), {
    minX: points[0].x,
    maxX: points[0].x,
    minY: points[0].y,
    maxY: points[0].y
  });
}

/**
 * Simplify points using Ramer-Douglas-Peucker algorithm
 */
export function simplifyPoints(points: Point[], tolerance: number = 0.05): Point[] {
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
}
