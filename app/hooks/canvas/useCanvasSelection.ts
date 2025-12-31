// Custom hook for managing selection state and operations

import { useState, useRef } from 'react';
import type { Point, SelectionState, GraphElement } from '@/app/types/canvas';

export interface UseCanvasSelectionReturn {
  selection: SelectionState;
  setSelection: React.Dispatch<React.SetStateAction<SelectionState>>;
  draggingPointIndex: number | null;
  setDraggingPointIndex: React.Dispatch<React.SetStateAction<number | null>>;
  draggingControlPointFlag: boolean;
  setDraggingControlPointFlag: React.Dispatch<React.SetStateAction<boolean>>;
  draggingControlPointFlag2: boolean;
  setDraggingControlPointFlag2: React.Dispatch<React.SetStateAction<boolean>>;
  draggingEntireElement: boolean;
  setDraggingEntireElement: React.Dispatch<React.SetStateAction<boolean>>;
  elementDragStart: Point | null;
  setElementDragStart: React.Dispatch<React.SetStateAction<Point | null>>;
  selectedElementsOriginalStatesRef: React.MutableRefObject<Map<number, GraphElement> | null>;
  mouseDownPosition: Point | null;
  setMouseDownPosition: React.Dispatch<React.SetStateAction<Point | null>>;
  mouseDownOnElementId: number | null;
  setMouseDownOnElementId: React.Dispatch<React.SetStateAction<number | null>>;
  mouseDownWithCtrl: boolean;
  setMouseDownWithCtrl: React.Dispatch<React.SetStateAction<boolean>>;
  selectionBox: { start: Point; end: Point } | null;
  setSelectionBox: React.Dispatch<React.SetStateAction<{ start: Point; end: Point } | null>>;
  isDrawingSelectionBox: boolean;
  setIsDrawingSelectionBox: React.Dispatch<React.SetStateAction<boolean>>;
  justFinishedSelectionBoxRef: React.MutableRefObject<boolean>;
  clearSelection: () => void;
  selectElement: (elementId: number) => void;
  toggleElementInSelection: (elementId: number) => void;
}

export function useCanvasSelection(): UseCanvasSelectionReturn {
  const [selection, setSelection] = useState<SelectionState>({
    elementIds: new Set(),
    textBoxIds: new Set()
  });
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const [draggingControlPointFlag, setDraggingControlPointFlag] = useState(false);
  const [draggingControlPointFlag2, setDraggingControlPointFlag2] = useState(false);
  const [draggingEntireElement, setDraggingEntireElement] = useState(false);
  const [elementDragStart, setElementDragStart] = useState<Point | null>(null);
  const selectedElementsOriginalStatesRef = useRef<Map<number, GraphElement> | null>(null);

  const [mouseDownPosition, setMouseDownPosition] = useState<Point | null>(null);
  const [mouseDownOnElementId, setMouseDownOnElementId] = useState<number | null>(null);
  const [mouseDownWithCtrl, setMouseDownWithCtrl] = useState(false);

  const [selectionBox, setSelectionBox] = useState<{ start: Point; end: Point } | null>(null);
  const [isDrawingSelectionBox, setIsDrawingSelectionBox] = useState(false);
  const justFinishedSelectionBoxRef = useRef(false);

  const clearSelection = () => {
    setSelection({ elementIds: new Set(), textBoxIds: new Set() });
  };

  const selectElement = (elementId: number) => {
    setSelection({ elementIds: new Set([elementId]), textBoxIds: new Set() });
  };

  const toggleElementInSelection = (elementId: number) => {
    setSelection(prev => {
      const newElementIds = new Set(prev.elementIds);
      if (newElementIds.has(elementId)) {
        newElementIds.delete(elementId);
      } else {
        newElementIds.add(elementId);
      }
      return { ...prev, elementIds: newElementIds };
    });
  };

  return {
    selection,
    setSelection,
    draggingPointIndex,
    setDraggingPointIndex,
    draggingControlPointFlag,
    setDraggingControlPointFlag,
    draggingControlPointFlag2,
    setDraggingControlPointFlag2,
    draggingEntireElement,
    setDraggingEntireElement,
    elementDragStart,
    setElementDragStart,
    selectedElementsOriginalStatesRef,
    mouseDownPosition,
    setMouseDownPosition,
    mouseDownOnElementId,
    setMouseDownOnElementId,
    mouseDownWithCtrl,
    setMouseDownWithCtrl,
    selectionBox,
    setSelectionBox,
    isDrawingSelectionBox,
    setIsDrawingSelectionBox,
    justFinishedSelectionBoxRef,
    clearSelection,
    selectElement,
    toggleElementInSelection
  };
}
