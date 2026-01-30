// Custom hook for managing labels and textboxes state

import { useState, useRef } from 'react';
import type { Point, GraphLabels, TextBox } from '@/app/types/canvas';
import { DEFAULT_LABELS } from '@/app/types/canvas';

export interface UseCanvasLabelsReturn {
  labels: GraphLabels;
  setLabels: React.Dispatch<React.SetStateAction<GraphLabels>>;
  draggingTextBox: string | null;
  setDraggingTextBox: React.Dispatch<React.SetStateAction<string | null>>;
  resizingTextBox: { id: string; corner: 'ne' | 'se' | 'sw' | 'nw' } | null;
  setResizingTextBox: React.Dispatch<React.SetStateAction<{ id: string; corner: 'ne' | 'se' | 'sw' | 'nw' } | null>>;
  textBoxDragOffset: Point;
  setTextBoxDragOffset: React.Dispatch<React.SetStateAction<Point>>;
  editingTextBoxId: string | null;
  setEditingTextBoxId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedElementLabelIndex: number | null;
  setSelectedElementLabelIndex: React.Dispatch<React.SetStateAction<number | null>>;
  editingElementLabelIndex: number | null;
  setEditingElementLabelIndex: React.Dispatch<React.SetStateAction<number | null>>;
  resizingElementLabelIndex: number | null;
  setResizingElementLabelIndex: React.Dispatch<React.SetStateAction<number | null>>;
  elementLabelResizeStart: { canvasY: number; initialFontSize: number } | null;
  setElementLabelResizeStart: React.Dispatch<React.SetStateAction<{ canvasY: number; initialFontSize: number } | null>>;
  draggingElementLabel: number | null;
  setDraggingElementLabel: React.Dispatch<React.SetStateAction<number | null>>;
  selectedIntersectionLabelIndex: number | null;
  setSelectedIntersectionLabelIndex: React.Dispatch<React.SetStateAction<number | null>>;
  draggingIntersectionLabel: number | null;
  setDraggingIntersectionLabel: React.Dispatch<React.SetStateAction<number | null>>;
  labelsDragStartRef: React.MutableRefObject<GraphLabels | null>;
}

export function useCanvasLabels(): UseCanvasLabelsReturn {
  const [labels, setLabels] = useState<GraphLabels>(DEFAULT_LABELS);
  const [draggingTextBox, setDraggingTextBox] = useState<string | null>(null);
  const [resizingTextBox, setResizingTextBox] = useState<{
    id: string;
    corner: 'ne' | 'se' | 'sw' | 'nw';
  } | null>(null);
  const [textBoxDragOffset, setTextBoxDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [editingTextBoxId, setEditingTextBoxId] = useState<string | null>(null);
  const [selectedElementLabelIndex, setSelectedElementLabelIndex] = useState<number | null>(null);
  const [editingElementLabelIndex, setEditingElementLabelIndex] = useState<number | null>(null);
  const [resizingElementLabelIndex, setResizingElementLabelIndex] = useState<number | null>(null);
  const [elementLabelResizeStart, setElementLabelResizeStart] = useState<{ canvasY: number; initialFontSize: number } | null>(null);
  const [draggingElementLabel, setDraggingElementLabel] = useState<number | null>(null);
  const [selectedIntersectionLabelIndex, setSelectedIntersectionLabelIndex] = useState<number | null>(null);
  const [draggingIntersectionLabel, setDraggingIntersectionLabel] = useState<number | null>(null);
  const labelsDragStartRef = useRef<GraphLabels | null>(null);

  return {
    labels,
    setLabels,
    draggingTextBox,
    setDraggingTextBox,
    resizingTextBox,
    setResizingTextBox,
    textBoxDragOffset,
    setTextBoxDragOffset,
    editingTextBoxId,
    setEditingTextBoxId,
    selectedElementLabelIndex,
    setSelectedElementLabelIndex,
    editingElementLabelIndex,
    setEditingElementLabelIndex,
    resizingElementLabelIndex,
    setResizingElementLabelIndex,
    elementLabelResizeStart,
    setElementLabelResizeStart,
    draggingElementLabel,
    setDraggingElementLabel,
    selectedIntersectionLabelIndex,
    setSelectedIntersectionLabelIndex,
    draggingIntersectionLabel,
    setDraggingIntersectionLabel,
    labelsDragStartRef
  };
}
