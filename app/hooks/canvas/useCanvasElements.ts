// Custom hook for managing canvas elements and fill areas state

import { useState } from 'react';
import type { GraphElement, FillArea } from '@/app/types/canvas';

export interface UseCanvasElementsReturn {
  elements: GraphElement[];
  setElements: React.Dispatch<React.SetStateAction<GraphElement[]>>;
  fillAreas: FillArea[];
  setFillAreas: React.Dispatch<React.SetStateAction<FillArea[]>>;
  addElement: (element: GraphElement) => void;
  addFillArea: (fillArea: FillArea) => void;
  clearElements: () => void;
}

export function useCanvasElements(): UseCanvasElementsReturn {
  const [elements, setElements] = useState<GraphElement[]>([]);
  const [fillAreas, setFillAreas] = useState<FillArea[]>([]);

  const addElement = (element: GraphElement) => {
    setElements(prev => [...prev, element]);
  };

  const addFillArea = (fillArea: FillArea) => {
    setFillAreas(prev => [...prev, fillArea]);
  };

  const clearElements = () => {
    setElements([]);
    setFillAreas([]);
  };

  return {
    elements,
    setElements,
    fillAreas,
    setFillAreas,
    addElement,
    addFillArea,
    clearElements
  };
}
