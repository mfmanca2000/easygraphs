// Custom hook for managing element grouping functionality

import { useState, useMemo, useCallback } from 'react';
import type { Group, SelectionState } from '@/app/types/canvas';

export interface UseCanvasGroupsReturn {
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  canGroup: boolean;
  canUngroup: boolean;
  createGroup: (memberIds: number[]) => Group;
  addGroup: (group: Group) => void;
  removeGroup: (groupId: string) => void;
  getGroupForElement: (elementId: number) => Group | undefined;
  getGroupMembersForElement: (elementId: number) => Set<number>;
}

export function useCanvasGroups(selection?: SelectionState): UseCanvasGroupsReturn {
  const [groups, setGroups] = useState<Group[]>([]);

  const canGroup = useMemo(() => {
    return selection ? selection.elementIds.size >= 2 : false;
  }, [selection]);

  const canUngroup = useMemo(() => {
    if (!selection || selection.elementIds.size === 0) return false;
    // Check if any selected elements are in a group
    return Array.from(selection.elementIds).some(elementId =>
      groups.some(g => g.memberIds.includes(elementId))
    );
  }, [selection, groups]);

  const createGroup = useCallback((memberIds: number[]): Group => {
    return {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      memberIds
    };
  }, []);

  const addGroup = useCallback((group: Group) => {
    setGroups(prev => [...prev, group]);
  }, []);

  const removeGroup = useCallback((groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  }, []);

  const getGroupForElement = useCallback((elementId: number): Group | undefined => {
    return groups.find(g => g.memberIds.includes(elementId));
  }, [groups]);

  const getGroupMembersForElement = useCallback((elementId: number): Set<number> => {
    const group = groups.find(g => g.memberIds.includes(elementId));
    return group ? new Set(group.memberIds) : new Set([elementId]);
  }, [groups]);

  return {
    groups,
    setGroups,
    canGroup,
    canUngroup,
    createGroup,
    addGroup,
    removeGroup,
    getGroupForElement,
    getGroupMembersForElement
  };
}
