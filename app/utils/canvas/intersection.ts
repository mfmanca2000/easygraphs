// Intersection detection algorithms

import type { Point, GraphElement } from '@/app/types/canvas';
import { lineIntersection, getElementSegments } from './geometry';

/**
 * Sample a bezier curve into discrete points
 */
export function sampleBezierCurve(element: GraphElement): Point[] {
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
}

/**
 * Get line segments from an element (including sampled bezier curves)
 */
export function getElementSegmentsWithBezier(element: GraphElement): Array<{ start: Point; end: Point }> {
  const segments: Array<{ start: Point; end: Point }> = [];

  if (element.type === 'bezier') {
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
  } else {
    // For other types, use the basic segment extraction
    return getElementSegments(element);
  }

  return segments;
}
