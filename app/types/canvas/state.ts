// State management and selection types

import type { GraphElement } from './elements';
import type { TextBox } from './labels';

// Selection state for multi-object selection
export interface SelectionState {
  elementIds: Set<number>;
  textBoxIds: Set<string>;
}

// Group interface
export interface Group {
  id: string;           // UUID for the group
  memberIds: number[];  // Indices of elements in the elements array
}

// Clipboard data for copy/paste
export interface ClipboardData {
  elements: GraphElement[];
  textBoxes: TextBox[];
  timestamp: number;
  groupMemberships: Map<number, string>; // element index -> group ID
}
