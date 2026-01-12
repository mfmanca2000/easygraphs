// Action and history types for undo/redo

import type { GraphElement, FillArea } from './elements';
import type { GraphLabels, TextBox } from './labels';
import type { Group } from './state';

export type Action =
  | { type: 'element' }
  | { type: 'fill' }
  | { type: 'modify'; elementId: number; previousState: GraphElement }
  | { type: 'label'; previousState: GraphLabels }
  | { type: 'paste'; previousElements: GraphElement[]; previousLabels: GraphLabels }
  | { type: 'delete'; deletedElements: {id: number, element: GraphElement}[]; deletedTextBoxes: TextBox[]; previousElementsLength: number }
  | { type: 'group'; previousGroups: Group[] }
  | { type: 'ungroup'; previousGroups: Group[] };
