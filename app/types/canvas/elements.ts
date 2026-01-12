// Graph element and shape definitions

import type { Point, LineStyle, ArrowType, CurveType } from './core';

export interface GraphElement {
  type: 'line' | 'bezier' | 'freehand' | 'function' | 'point';
  points: Point[];
  color: string;
  lineWidth: number;
  controlPoint?: Point;
  controlPoint2?: Point;  // For cubic bezier curves
  curveType?: CurveType;  // For bezier type - default: 'quadratic'
  formula?: string;  // For function type
  xMin?: number;     // For function type
  xMax?: number;     // For function type
  pointSize?: number;  // For point type
  showProjection?: boolean;  // For point type - whether to show projection lines
  lineStyle?: LineStyle;  // Line style - default: 'solid'
  opacity?: number;  // Opacity 0-1 - default: 1
  arrowType?: ArrowType;  // Arrow endpoints - default: 'none'
  arrowSize?: number;  // Arrow size in pixels (5-40) - default: lineWidth * 0.75
}

// Legacy fill area interface - deprecated, kept for migration
export interface FillAreaLegacy {
  elementId: number;
  fillAbove: boolean;
  color: string;
  fillToAxis?: boolean; // If true, fill to axis instead of canvas edge
}

// New boundary-based fill area types are in @/app/utils/canvas/fillArea
// Re-exported here for convenience
export type { BoundaryPoint, BoundarySegment, FillArea } from '@/app/utils/canvas/fillArea';

export interface IntersectionPoint {
  point: Point;
  elementId1: number;  // First element in the intersection
  elementId2: number;  // Second element in the intersection
  showProjection?: boolean;  // Whether to show projection for this intersection
  visible?: boolean;  // Whether this intersection is visible - default: true
}
