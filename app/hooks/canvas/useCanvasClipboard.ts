// Custom hook for managing clipboard operations

import { useState, useMemo } from 'react';
import type { ClipboardData } from '@/app/types/canvas';

export interface UseCanvasClipboardReturn {
  clipboard: ClipboardData | null;
  setClipboard: React.Dispatch<React.SetStateAction<ClipboardData | null>>;
  hasClipboardData: boolean;
  copyToClipboard: (data: ClipboardData) => void;
  clearClipboard: () => void;
}

export function useCanvasClipboard(): UseCanvasClipboardReturn {
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  const hasClipboardData = useMemo(() => clipboard !== null, [clipboard]);

  const copyToClipboard = (data: ClipboardData) => {
    setClipboard(data);
  };

  const clearClipboard = () => {
    setClipboard(null);
  };

  return {
    clipboard,
    setClipboard,
    hasClipboardData,
    copyToClipboard,
    clearClipboard
  };
}
