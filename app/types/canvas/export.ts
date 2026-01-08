// Export/import data structures and component interfaces

import type { Point, DrawMode, LineStyle, ArrowType, CurveType } from './core';
import type { GraphElement, FillArea, IntersectionPoint } from './elements';
import type { GraphLabels, TextBox } from './labels';
import type { SelectionState, Group } from './state';

export interface GraphExportData {
  elements: GraphElement[];
  fillAreas: FillArea[];
  panOffset: Point;
  labels: GraphLabels;
  groups: Group[];
}

export interface EasyGraphsExport {
  version: string;
  metadata: {
    exportDate: string;
    appVersion?: string;
  };
  canvas: {
    width: number;
    height: number;
  };
  view: {
    scale: { x: number; y: number };
    panOffset: { x: number; y: number };
    showGrid: boolean;
    showAxisUnits: boolean;
  };
  drawing: {
    elements: GraphElement[];
    fillAreas: FillArea[];
    labels: GraphLabels;
    groups: Group[];
  };
  settings: {
    strokeColor: string;
    strokeWidth: number;
    drawMode: DrawMode;
    lineStyle: LineStyle;
    opacity: number;
  };
}

export interface GraphCanvasProps {
  width?: number;
  height?: number;
  showGrid: boolean;
  showAxisUnits?: boolean;
  showOnlyPositive?: boolean;
  strokeColor: string;
  strokeWidth: number;
  lineStyle: LineStyle;
  opacity: number;
  arrowType: ArrowType;
  arrowSize: number;
  curveType: CurveType;
  drawMode: DrawMode;
  scale: { x: number; y: number };
  showIntersections?: boolean;
  intersectionPoints?: IntersectionPoint[];
  onCoordinateClick?: (point: Point) => void;
  onSelectionChange?: (elementId: number | null) => void;
  onElementsChange?: (elementCount: number) => void;
  onScaleChange?: (scale: { x: number; y: number }) => void;
  onLabelsChange?: (labels: GraphLabels) => void;
  onIntersectionsChange?: (intersections: IntersectionPoint[]) => void;
  onIntersectionContextMenu?: (intersectionIndex: number, x: number, y: number) => void;
  onElementContextMenu?: (elementId: number, x: number, y: number) => void;
  onAxisContextMenu?: (axis: 'x' | 'y', x: number, y: number) => void;
}

export interface GraphCanvasHandle {
  addLineByCoordinates: (start: Point, end: Point) => void;
  addPointByCoordinates: (point: Point) => void;
  addFillArea: (elementId: number, fillAbove: boolean, color: string, fillToAxis?: boolean) => void;
  addFunction: (formula: string, xMin: number, xMax: number, color: string, lineWidth: number, lineStyle?: LineStyle, opacity?: number) => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  getElements: () => GraphElement[];
  exportToPNG: () => void;
  exportToJPEG: (quality?: number) => void;
  exportToPDF: (pageSize?: string, orientation?: 'portrait' | 'landscape') => void;
  getSelectedElement: () => GraphElement | null;
  getSelectedElementId: () => number | null;
  updateSelectedElement: (color: string, lineWidth: number, addToHistory?: boolean, previousState?: GraphElement, lineStyle?: LineStyle, opacity?: number, arrowType?: ArrowType, arrowSize?: number) => void;
  addModifyAction: (elementId: number, previousState: GraphElement) => void;
  getExportData: () => GraphExportData;
  importData: (data: GraphExportData) => void;
  togglePointProjection: (elementId: number) => void;
  calculateAllIntersections: () => IntersectionPoint[];
  getLabels: () => GraphLabels;
  updateLabels: (newLabels: GraphLabels, addToHistory?: boolean) => void;
  addTextBox: (textBox: TextBox) => void;
  deleteTextBox: (id: string) => void;
  selectTextBox: (id: string) => void;
  copySelection: () => void;
  pasteSelection: () => void;
  deleteSelection: () => void;
  getSelection: () => SelectionState;
  groupSelection: () => void;
  ungroupSelection: () => void;
  getGroups: () => Group[];
  resetPanOffset: () => void;
}
