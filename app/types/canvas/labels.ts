// Label and text-related types

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

// Intersection label (attached to intersection points)
export interface IntersectionLabel {
  intersectionIndex: number;
  text: string;
  offsetX: number; // Offset from intersection point
  offsetY: number;
  fontFamily: string;
  fontSize: number;
  color: string;
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
  intersectionLabels: IntersectionLabel[];
  textBoxes: TextBox[];
}

// Default labels configuration
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
  intersectionLabels: [],
  textBoxes: []
};
