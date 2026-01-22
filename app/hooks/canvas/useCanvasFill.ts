// Fill tool state management hook

import { useState, useCallback } from 'react';
import type { BoundaryPoint, BoundarySegment } from '@/app/utils/canvas/fillArea';

export interface FillToolState {
  mode: 'building' | 'idle';
  currentBoundary: BoundaryPoint[];
  previewSegments: BoundarySegment[];
  hoveredPoint: BoundaryPoint | null;
}

export interface BoundaryEditState {
  mode: 'idle' | 'editing';
  editingFillAreaId: string | null;
  selectedVertexIndex: number | null;
  hoveredVertexIndex: number | null;
}

export function useCanvasFill() {
  const [fillToolState, setFillToolState] = useState<FillToolState>({
    mode: 'idle',
    currentBoundary: [],
    previewSegments: [],
    hoveredPoint: null
  });

  const [boundaryEditState, setBoundaryEditState] = useState<BoundaryEditState>({
    mode: 'idle',
    editingFillAreaId: null,
    selectedVertexIndex: null,
    hoveredVertexIndex: null
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
    // Return current boundary and segments for the caller to create the fill area
    const boundary = fillToolState.currentBoundary;
    const segments = fillToolState.previewSegments;
    resetFillTool();
    return { boundary, segments };
  }, [fillToolState.currentBoundary, fillToolState.previewSegments, resetFillTool]);

  // Boundary editing functions
  const startEditingBoundary = useCallback((fillAreaId: string) => {
    setBoundaryEditState({
      mode: 'editing',
      editingFillAreaId: fillAreaId,
      selectedVertexIndex: null,
      hoveredVertexIndex: null
    });
  }, []);

  const stopEditingBoundary = useCallback(() => {
    setBoundaryEditState({
      mode: 'idle',
      editingFillAreaId: null,
      selectedVertexIndex: null,
      hoveredVertexIndex: null
    });
  }, []);

  const setHoveredVertex = useCallback((index: number | null) => {
    setBoundaryEditState(prev => ({
      ...prev,
      hoveredVertexIndex: index
    }));
  }, []);

  const selectVertex = useCallback((index: number | null) => {
    setBoundaryEditState(prev => ({
      ...prev,
      selectedVertexIndex: index
    }));
  }, []);

  return {
    fillToolState,
    resetFillTool,
    setHoveredPoint,
    addBoundaryPoint,
    completeFill,
    boundaryEditState,
    startEditingBoundary,
    stopEditingBoundary,
    setHoveredVertex,
    selectVertex
  };
}
