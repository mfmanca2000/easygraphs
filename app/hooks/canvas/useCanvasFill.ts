// Fill tool state management hook

import { useState, useCallback } from 'react';
import type { BoundaryPoint, BoundarySegment } from '@/app/utils/canvas/fillArea';

export interface FillToolState {
  mode: 'building' | 'idle';
  currentBoundary: BoundaryPoint[];
  previewSegments: BoundarySegment[];
  hoveredPoint: BoundaryPoint | null;
}

export function useCanvasFill() {
  const [fillToolState, setFillToolState] = useState<FillToolState>({
    mode: 'idle',
    currentBoundary: [],
    previewSegments: [],
    hoveredPoint: null
  });

  const resetFillTool = useCallback(() => {
    setFillToolState({
      mode: 'idle',
      currentBoundary: [],
      previewSegments: [],
      hoveredPoint: null
    });
  }, []);

  const setHoveredPoint = useCallback((point: BoundaryPoint | null) => {
    setFillToolState(prev => ({
      ...prev,
      hoveredPoint: point
    }));
  }, []);

  const addBoundaryPoint = useCallback((point: BoundaryPoint, segment: BoundarySegment | null) => {
    setFillToolState(prev => {
      const newBoundary = [...prev.currentBoundary, point];
      const newSegments = segment ? [...prev.previewSegments, segment] : prev.previewSegments;

      return {
        mode: 'building',
        currentBoundary: newBoundary,
        previewSegments: newSegments,
        hoveredPoint: null
      };
    });
  }, []);

  const completeFill = useCallback(() => {
    // Return current boundary for the caller to create the fill area
    const boundary = fillToolState.currentBoundary;
    resetFillTool();
    return boundary;
  }, [fillToolState.currentBoundary, resetFillTool]);

  return {
    fillToolState,
    resetFillTool,
    setHoveredPoint,
    addBoundaryPoint,
    completeFill
  };
}
