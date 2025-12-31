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
  selectedElementLabelIndex: number | null;
  setSelectedElementLabelIndex: React.Dispatch<React.SetStateAction<number | null>>;
  draggingElementLabel: number | null;
  setDraggingElementLabel: React.Dispatch<React.SetStateAction<number | null>>;
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
  const [selectedElementLabelIndex, setSelectedElementLabelIndex] = useState<number | null>(null);
  const [draggingElementLabel, setDraggingElementLabel] = useState<number | null>(null);
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
    selectedElementLabelIndex,
    setSelectedElementLabelIndex,
    draggingElementLabel,
    setDraggingElementLabel,
    labelsDragStartRef
  };
}
