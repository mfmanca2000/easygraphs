// Core primitive types used throughout the canvas application

export interface Point {
  x: number;
  y: number;
}

export type DrawMode =
  | 'line'
  | 'bezier'
  | 'freehand'
  | 'fill'
  | 'select'
  | 'function'
  | 'point'
  | 'textbox';

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export type ArrowType = 'none' | 'end' | 'start' | 'both';

export type CurveType = 'quadratic' | 'cubic' | 's-curve';
