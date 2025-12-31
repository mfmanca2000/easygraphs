// Custom hook for managing undo/redo history

import { useState, useRef, useMemo } from 'react';
import type { Action } from '@/app/types/canvas';

export interface UseCanvasHistoryReturn {
  actionHistory: Action[];
  setActionHistory: React.Dispatch<React.SetStateAction<Action[]>>;
  redoHistory: Action[];
  setRedoHistory: React.Dispatch<React.SetStateAction<Action[]>>;
  undoInProgressRef: React.MutableRefObject<boolean>;
  canUndo: boolean;
  canRedo: boolean;
  addAction: (action: Action) => void;
  clearHistory: () => void;
  moveActionToRedo: () => void;
  moveActionFromRedo: () => void;
}

export function useCanvasHistory(): UseCanvasHistoryReturn {
  const [actionHistory, setActionHistory] = useState<Action[]>([]);
  const [redoHistory, setRedoHistory] = useState<Action[]>([]);
  const undoInProgressRef = useRef(false);

  const canUndo = useMemo(() => actionHistory.length > 0, [actionHistory.length]);
  const canRedo = useMemo(() => redoHistory.length > 0, [redoHistory.length]);

  const addAction = (action: Action) => {
    setActionHistory(prev => [...prev, action]);
    setRedoHistory([]);
  };

  const clearHistory = () => {
    setActionHistory([]);
    setRedoHistory([]);
  };

  const moveActionToRedo = () => {
    if (actionHistory.length === 0) return;
    const lastAction = actionHistory[actionHistory.length - 1];
    setActionHistory(prev => prev.slice(0, -1));
    setRedoHistory(prev => [...prev, lastAction]);
  };

  const moveActionFromRedo = () => {
    if (redoHistory.length === 0) return;
    const lastRedo = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));
    setActionHistory(prev => [...prev, lastRedo]);
  };

  return {
    actionHistory,
    setActionHistory,
    redoHistory,
    setRedoHistory,
    undoInProgressRef,
    canUndo,
    canRedo,
    addAction,
    clearHistory,
    moveActionToRedo,
    moveActionFromRedo
  };
}
