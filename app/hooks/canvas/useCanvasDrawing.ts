// Custom hook for managing drawing state

import { useState } from 'react';
import type { Point } from '@/app/types/canvas';

export interface UseCanvasDrawingReturn {
  currentPoints: Point[];
  setCurrentPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  isDrawing: boolean;
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  tempControlPoint: Point | null;
  setTempControlPoint: React.Dispatch<React.SetStateAction<Point | null>>;
  tempControlPoint2: Point | null;
  setTempControlPoint2: React.Dispatch<React.SetStateAction<Point | null>>;
  draggingControl: boolean;
  setDraggingControl: React.Dispatch<React.SetStateAction<boolean>>;
  draggingControl2: boolean;
  setDraggingControl2: React.Dispatch<React.SetStateAction<boolean>>;
  resetDrawing: () => void;
}

export function useCanvasDrawing(): UseCanvasDrawingReturn {
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempControlPoint, setTempControlPoint] = useState<Point | null>(null);
  const [tempControlPoint2, setTempControlPoint2] = useState<Point | null>(null);
  const [draggingControl, setDraggingControl] = useState(false);
  const [draggingControl2, setDraggingControl2] = useState(false);

  const resetDrawing = () => {
    setCurrentPoints([]);
    setIsDrawing(false);
    setTempControlPoint(null);
    setTempControlPoint2(null);
    setDraggingControl(false);
    setDraggingControl2(false);
  };

  return {
    currentPoints,
    setCurrentPoints,
    isDrawing,
    setIsDrawing,
    tempControlPoint,
    setTempControlPoint,
    tempControlPoint2,
    setTempControlPoint2,
    draggingControl,
    setDraggingControl,
    draggingControl2,
    setDraggingControl2,
    resetDrawing
  };
}
