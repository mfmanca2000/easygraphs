// Custom hook for managing pan and zoom state

import { useState, useRef } from 'react';
import type { Point } from '@/app/types/canvas';

export interface UseCanvasPanningReturn {
  panOffset: Point;
  setPanOffset: React.Dispatch<React.SetStateAction<Point>>;
  isPanning: boolean;
  setIsPanning: React.Dispatch<React.SetStateAction<boolean>>;
  panStart: Point | null;
  setPanStart: React.Dispatch<React.SetStateAction<Point | null>>;
  justPannedRef: React.MutableRefObject<boolean>;
  startPanning: (position: Point) => void;
  updatePan: (currentPosition: Point) => void;
  stopPanning: () => void;
  resetPan: () => void;
}

export function useCanvasPanning(): UseCanvasPanningReturn {
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const justPannedRef = useRef(false);

  const startPanning = (position: Point) => {
    setIsPanning(true);
    setPanStart(position);
  };

  const updatePan = (currentPosition: Point) => {
    if (!panStart) return;
    const dx = currentPosition.x - panStart.x;
    const dy = currentPosition.y - panStart.y;
    setPanOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    setPanStart(currentPosition);
    justPannedRef.current = true;
  };

  const stopPanning = () => {
    setIsPanning(false);
    setPanStart(null);
  };

  const resetPan = () => {
    setPanOffset({ x: 0, y: 0 });
  };

  return {
    panOffset,
    setPanOffset,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    justPannedRef,
    startPanning,
    updatePan,
    stopPanning,
    resetPan
  };
}
