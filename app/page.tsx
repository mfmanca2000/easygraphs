'use client';

import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import GraphCanvas from './components/GraphCanvas';
import type { DrawMode, Point, GraphCanvasHandle, GraphElement, EasyGraphsExport, GraphLabels, IntersectionPoint, IntersectionLabel } from '@/app/types/canvas';
import { DEFAULT_LABELS } from '@/app/types/canvas';
import type { FillArea } from '@/app/utils/canvas/fillArea';
import Toolbar from './components/Toolbar';
import ScaleControls from './components/ScaleControls';
import CoordinateInput from './components/CoordinateInput';
import FillAreaEditor from './components/FillAreaEditor';
import FunctionInput from './components/FunctionInput';
import LabelControls from './components/LabelControls';
import CharacterPalette from './components/CharacterPalette';
import AddLabelModal from './components/AddLabelModal';
import QuickGuidePanel from './components/QuickGuidePanel';
import { CollapsiblePanel } from './components/CollapsiblePanel';
import { Sidebar } from './components/Sidebar';
import { MobileDrawer } from './components/MobileDrawer';
import AppHeader from './components/AppHeader';

export default function Home() {
  const canvasRef = useRef<GraphCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxisUnits, setShowAxisUnits] = useState(true);
  const [showOnlyPositive, setShowOnlyPositive] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [opacity, setOpacity] = useState(1);
  const [arrowType, setArrowType] = useState<'none' | 'end' | 'start' | 'both'>('none');
  const [arrowSize, setArrowSize] = useState(15);
  const [curveType, setCurveType] = useState<'quadratic' | 'cubic' | 's-curve'>('quadratic');
  const [drawMode, setDrawMode] = useState<DrawMode>('line');
  const [scale, setScale] = useState({ x: 40, y: 40 });
  const [currentPoint, setCurrentPoint] = useState<Point | undefined>(undefined);
  const [elementCount, setElementCount] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [selectedElement, setSelectedElement] = useState<GraphElement | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [elements, setElements] = useState<GraphElement[]>([]);
  const originalElementRef = useRef<GraphElement | null>(null);
  const [labels, setLabels] = useState<GraphLabels>(DEFAULT_LABELS);
  const [showCharacterPalette, setShowCharacterPalette] = useState(false);
  const [showQuickGuide, setShowQuickGuide] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<{ elementIds: Set<number>, textBoxIds: Set<string> }>({
    elementIds: new Set(),
    textBoxIds: new Set()
  });
  const [currentGroups, setCurrentGroups] = useState<any[]>([]);
  const isUpdatingFromSelectionRef = useRef(false);
  const [showIntersections, setShowIntersections] = useState(false);
  const [intersectionPoints, setIntersectionPoints] = useState<IntersectionPoint[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [intersectionContextMenu, setIntersectionContextMenu] = useState<{
    intersectionIndex: number;
    x: number;
    y: number;
  } | null>(null);
  const [elementContextMenu, setElementContextMenu] = useState<{
    elementId: number;
    x: number;
    y: number;
  } | null>(null);
  const [showAddLabelModal, setShowAddLabelModal] = useState(false);
  const [labelModalElementId, setLabelModalElementId] = useState<number | null>(null);
  const [labelModalIntersectionIndex, setLabelModalIntersectionIndex] = useState<number | null>(null);
  const [axisContextMenu, setAxisContextMenu] = useState<{
    axis: 'x' | 'y';
    x: number;
    y: number;
  } | null>(null);
  const [fillAreaContextMenu, setFillAreaContextMenu] = useState<{
    fillAreaIndex: number;
    x: number;
    y: number;
  } | null>(null);
  const [fillAreas, setFillAreas] = useState<FillArea[]>([]);

  // Recalculate intersections when elements change (always calculate, even if not shown)
  useEffect(() => {
    if (canvasRef.current && elements.length > 1) {
      const newIntersections = canvasRef.current.calculateAllIntersections();

      // Preserve showProjection and visible state from existing intersections
      // Match intersections by their element pair (elementId1 and elementId2)
      setIntersectionPoints(prev => {
        const updatedIntersections = newIntersections.map(newInt => {
          const existing = prev.find(
            oldInt =>
              (oldInt.elementId1 === newInt.elementId1 && oldInt.elementId2 === newInt.elementId2) ||
              (oldInt.elementId1 === newInt.elementId2 && oldInt.elementId2 === newInt.elementId1)
          );
          return {
            ...newInt,
            showProjection: existing?.showProjection ?? false,
            visible: existing?.visible ?? true  // Default to visible for new intersections
          };
        });
        return updatedIntersections;
      });
    } else if (elements.length <= 1) {
      // Clear intersections if there aren't enough elements
      setIntersectionPoints([]);
    }
  }, [elements]);

  // Responsive canvas sizing - measure the actual container
  useEffect(() => {
    const updateCanvasSize = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Container has 12px padding on every side
      const padding = 24;

      setCanvasSize({
        width: Math.max(280, containerWidth - padding),
        height: Math.max(280, containerHeight - padding)
      });
    };

    // Initial size
    updateCanvasSize();

    // Use ResizeObserver for more accurate container size tracking
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateCanvasSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Update toolbar to match selected element's properties and save original state
  useEffect(() => {
    if (selectedElement && selectedElementId !== null) {
      // Set flag to indicate we're updating from selection (not user input)
      isUpdatingFromSelectionRef.current = true;

      setStrokeColor(selectedElement.color);
      setStrokeWidth(selectedElement.lineWidth);
      setLineStyle(selectedElement.lineStyle || 'solid');
      setOpacity(selectedElement.opacity ?? 1);
      setArrowType(selectedElement.arrowType || 'none');
      setArrowSize(selectedElement.arrowSize ?? Math.max(5, Math.min(40, selectedElement.lineWidth * 0.75)));
      // Save original state when a new element is selected
      originalElementRef.current = { ...selectedElement };

      // Reset flag after state updates
      setTimeout(() => {
        isUpdatingFromSelectionRef.current = false;
      }, 0);
    } else if (selectedElementId === null) {
      // Selection cleared - clear original state
      originalElementRef.current = null;
    }
  }, [selectedElement, selectedElementId, elements]);

  // Apply toolbar changes to selected element when user actively changes values
  useEffect(() => {
    // Don't apply if we're updating toolbar from selection (avoid feedback loop)
    if (isUpdatingFromSelectionRef.current) {
      return;
    }

    // Apply user changes to selected element
    if (selectedElementId !== null && canvasRef.current && selectedElement && originalElementRef.current) {
      // Check if values actually changed from current element state
      if (selectedElement.color !== strokeColor ||
        selectedElement.lineWidth !== strokeWidth ||
        selectedElement.lineStyle !== lineStyle ||
        selectedElement.opacity !== opacity ||
        selectedElement.arrowType !== arrowType ||
        selectedElement.arrowSize !== arrowSize) {
        // Apply change without adding to history
        canvasRef.current.updateSelectedElement(strokeColor, strokeWidth, false, undefined, lineStyle, opacity, arrowType, arrowSize);
      }
    }

    // Note: selectedElement is intentionally excluded to avoid extra re-renders when the element updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeColor, strokeWidth, lineStyle, opacity, arrowType, arrowSize, selectedElementId]);

  // When selection changes, finalize any edits by adding a single entry to history
  const prevSelectedIdRef = useRef<number | null>(null);
  useEffect(() => {
    const prevId = prevSelectedIdRef.current;
    prevSelectedIdRef.current = selectedElementId;

    // If selection changed from a previous element
    if (prevId !== null && prevId !== selectedElementId && originalElementRef.current && canvasRef.current) {
      const elements = canvasRef.current.getElements();
      if (prevId < elements.length) {
        const currentState = elements[prevId];
        // Check if the element was actually modified
        if (currentState.color !== originalElementRef.current.color ||
          currentState.lineWidth !== originalElementRef.current.lineWidth ||
          currentState.lineStyle !== originalElementRef.current.lineStyle ||
          currentState.opacity !== originalElementRef.current.opacity ||
          currentState.arrowType !== originalElementRef.current.arrowType ||
          currentState.arrowSize !== originalElementRef.current.arrowSize) {
          // Add a single modify action for all the changes made to the previous element
          canvasRef.current.addModifyAction(prevId, originalElementRef.current);
        }
      }
    }
  }, [selectedElementId]);

  // Auto-update arrowSize when strokeWidth changes (only when no element is selected)
  useEffect(() => {
    if (selectedElementId === null) {
      setArrowSize(Math.max(5, Math.min(40, strokeWidth * 0.75)));
    }
  }, [strokeWidth, selectedElementId]);

  const handleClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
      // Clear intersection points when canvas is cleared
      setIntersectionPoints([]);
      setShowIntersections(false);
    }
  };

  const handleUndo = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };

  const handleRedo = () => {
    if (canvasRef.current) {
      canvasRef.current.redo();
    }
  };

  const handleResetToDefault = () => {
    setScale({ x: 40, y: 40 });
    canvasRef.current?.resetPanOffset();
  };

  const handleZoomIn = () => {
    const newScaleX = Math.min(100, scale.x * 1.1);
    const newScaleY = Math.min(100, scale.y * 1.1);
    setScale({ x: newScaleX, y: newScaleY });
  };

  const handleZoomOut = () => {
    const newScaleX = Math.max(10, scale.x * 0.9);
    const newScaleY = Math.max(10, scale.y * 0.9);
    setScale({ x: newScaleX, y: newScaleY });
  };

  const handleCopy = () => {
    if (canvasRef.current) {
      canvasRef.current.copySelection();
    }
  };

  const handlePaste = () => {
    if (canvasRef.current) {
      canvasRef.current.pasteSelection();
    }
  };

  const handleDelete = () => {
    if (canvasRef.current) {
      canvasRef.current.deleteSelection();
    }
  };

  const handleGroup = () => {
    if (canvasRef.current) {
      canvasRef.current.groupSelection();

      // Force synchronous state update to immediately recalculate button states
      flushSync(() => {
        const newSelection = canvasRef.current!.getSelection();
        const newGroups = canvasRef.current!.getGroups() || [];

        setCurrentSelection(newSelection);
        setCurrentGroups(newGroups);
      });
    }
  };

  const handleUngroup = () => {
    if (canvasRef.current) {
      canvasRef.current.ungroupSelection();
      // Force synchronous state update to immediately recalculate button states
      flushSync(() => {
        setCurrentSelection(canvasRef.current!.getSelection());
        setCurrentGroups(canvasRef.current!.getGroups() || []);
      });
    }
  };

  const handleAddLineByCoordinates = (start: Point, end: Point) => {
    if (canvasRef.current) {
      canvasRef.current.addLineByCoordinates(start, end);
    }
  };

  const handleAddPointByCoordinates = (point: Point) => {
    if (canvasRef.current) {
      canvasRef.current.addPointByCoordinates(point);
    }
  };

  const handleFillColorChange = (index: number, color: string) => {
    if (canvasRef.current) {
      canvasRef.current.updateFillArea(index, { color });
    }
  };

  const handleFillOpacityChange = (index: number, opacity: number) => {
    if (canvasRef.current) {
      canvasRef.current.updateFillArea(index, { opacity });
    }
  };

  const handleFillDelete = (index: number) => {
    if (canvasRef.current) {
      canvasRef.current.deleteFillArea(index);
    }
  };

  const handleEditBoundary = (fillAreaId: string) => {
    if (canvasRef.current) {
      canvasRef.current.startEditingFillBoundary(fillAreaId);
      // Switch to select mode so user can see the boundary editor
      setDrawMode('select');
    }
  };

  const handleFillAreasChange = (newFillAreas: FillArea[]) => {
    setFillAreas(newFillAreas);
  };

  const handleAddFunction = (formula: string, xMin: number, xMax: number, color: string, lineWidth: number) => {
    if (canvasRef.current) {
      canvasRef.current.addFunction(formula, xMin, xMax, color, lineWidth, lineStyle, opacity);
    }
  };

  const handleCoordinateClick = (point: Point) => {
    setCurrentPoint(point);
  };

  const handleExport = () => {
    if (canvasRef.current) {
      canvasRef.current.exportToPNG();
    }
  };

  const handleExportJPEG = (quality: number) => {
    if (canvasRef.current) {
      canvasRef.current.exportToJPEG(quality);
    }
  };

  const handleExportPDF = (pageSize: string, orientation: 'portrait' | 'landscape') => {
    if (canvasRef.current) {
      canvasRef.current.exportToPDF(pageSize, orientation);
    }
  };

  const handleExportJSON = () => {
    if (!canvasRef.current) return;

    // Get data from GraphCanvas
    const canvasData = canvasRef.current.getExportData();

    // Build complete export object
    const exportData: EasyGraphsExport = {
      version: "1.0.0",
      metadata: {
        exportDate: new Date().toISOString(),
        appVersion: "1.0.0"
      },
      canvas: {
        width: canvasSize.width,
        height: canvasSize.height
      },
      view: {
        scale: { ...scale },
        panOffset: canvasData.panOffset,
        showGrid,
        showAxisUnits
      },
      drawing: {
        elements: canvasData.elements,
        fillAreas: canvasData.fillAreas,
        labels: canvasData.labels,
        groups: canvasData.groups
      },
      settings: {
        strokeColor,
        strokeWidth,
        drawMode,
        lineStyle,
        opacity
      }
    };

    // Create and download JSON file
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.download = `easygraphs-${timestamp}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData: EasyGraphsExport = JSON.parse(text);

        // Validate schema version
        if (!importData.version || importData.version !== "1.0.0") {
          alert('Unsupported file version. Please use a compatible EasyGraphs export file.');
          return;
        }

        // Validate required fields
        if (!importData.drawing || !importData.view) {
          alert('Invalid EasyGraphs file format.');
          return;
        }

        // Import canvas data first
        if (canvasRef.current) {
          canvasRef.current.importData({
            elements: importData.drawing.elements,
            fillAreas: importData.drawing.fillAreas,
            panOffset: importData.view.panOffset,
            labels: importData.drawing.labels || DEFAULT_LABELS,
            groups: (importData.drawing as any).groups || []
          });
        }

        // Update page-level labels state
        setLabels(importData.drawing.labels || DEFAULT_LABELS);

        // Update page-level state
        setScale(importData.view.scale);
        setShowGrid(importData.view.showGrid);
        setShowAxisUnits(importData.view.showAxisUnits);

        // Optionally restore canvas size (may want to skip on mobile)
        if (window.innerWidth >= 1024) {
          setCanvasSize({
            width: importData.canvas.width,
            height: importData.canvas.height
          });
        }

        // Restore settings if available
        if (importData.settings) {
          setStrokeColor(importData.settings.strokeColor);
          setStrokeWidth(importData.settings.strokeWidth);
          setDrawMode(importData.settings.drawMode);
          setLineStyle(importData.settings.lineStyle || 'solid');
          setOpacity(importData.settings.opacity ?? 1);
        }

        // Update element count
        setElementCount(importData.drawing.elements.length);

      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import file. Please check that it is a valid EasyGraphs JSON file.');
      }
    };

    input.click();
  };

  const handleSelectionChange = (elementId: number | null) => {
    if (canvasRef.current) {
      const element = canvasRef.current.getSelectedElement();
      setSelectedElement(element);
      setSelectedElementId(elementId);

      // Update hasSelection based on current selection state
      const selection = canvasRef.current.getSelection();
      setHasSelection(selection.elementIds.size > 0 || selection.textBoxIds.size > 0);

      // Update selection and groups state for reactive canGroup/canUngroup
      setCurrentSelection(selection);
      setCurrentGroups(canvasRef.current.getGroups() || []);
    }
  };

  const handleElementsChange = (count: number) => {
    setElementCount(count);
    // Also update the elements array
    if (canvasRef.current) {
      const currentElements = canvasRef.current.getElements();
      setElements(currentElements);
    }
  };

  const handleTogglePointProjection = (elementId: number) => {
    if (canvasRef.current) {
      canvasRef.current.togglePointProjection(elementId);
      // Update the selected element to reflect the change
      const element = canvasRef.current.getSelectedElement();
      setSelectedElement(element);
      // Update originalElementRef so the projection change isn't included in batched color/width changes
      if (element) {
        originalElementRef.current = { ...element };
      }
    }
  };

  const handleToggleIntersections = () => {
    const newShowIntersections = !showIntersections;
    setShowIntersections(newShowIntersections);

    if (newShowIntersections && canvasRef.current) {
      // Calculate intersections when turning on, preserving existing states
      const newIntersections = canvasRef.current.calculateAllIntersections();
      setIntersectionPoints(prev => {
        const updatedIntersections = newIntersections.map(newInt => {
          const existing = prev.find(
            oldInt =>
              (oldInt.elementId1 === newInt.elementId1 && oldInt.elementId2 === newInt.elementId2) ||
              (oldInt.elementId1 === newInt.elementId2 && oldInt.elementId2 === newInt.elementId1)
          );
          return {
            ...newInt,
            showProjection: existing?.showProjection ?? false,
            visible: existing?.visible ?? true
          };
        });
        return updatedIntersections;
      });
    }
    // Note: We keep intersectionPoints even when hiding them, so fill areas continue to work
  };

  const handleToggleIntersectionProjection = (intersectionIndex: number) => {
    setIntersectionPoints(prev => {
      const newIntersections = [...prev];
      newIntersections[intersectionIndex] = {
        ...newIntersections[intersectionIndex],
        showProjection: !newIntersections[intersectionIndex].showProjection
      };
      return newIntersections;
    });
  };

  const handleToggleIntersectionVisibility = (intersectionIndex: number) => {
    setIntersectionPoints(prev => {
      const newIntersections = [...prev];
      newIntersections[intersectionIndex] = {
        ...newIntersections[intersectionIndex],
        visible: !newIntersections[intersectionIndex].visible
      };
      return newIntersections;
    });
  };

  const handleShowAllIntersections = () => {
    setIntersectionPoints(prev => prev.map(int => ({ ...int, visible: true })));
  };

  const handleHideAllIntersections = () => {
    setIntersectionPoints(prev => prev.map(int => ({ ...int, visible: false })));
  };

  const handleIntersectionContextMenu = (intersectionIndex: number, x: number, y: number) => {
    setIntersectionContextMenu({ intersectionIndex, x, y });
  };

  const handleCloseIntersectionContextMenu = () => {
    setIntersectionContextMenu(null);
  };

  const handleElementContextMenu = (elementId: number, x: number, y: number) => {
    setElementContextMenu({ elementId, x, y });
  };

  const handleCloseElementContextMenu = () => {
    setElementContextMenu(null);
  };

  const handleTogglePointProjectionFromMenu = (elementId: number) => {
    handleTogglePointProjection(elementId);
    handleCloseElementContextMenu();
  };

  const handleOpenAddLabelModal = (elementId: number) => {
    setLabelModalElementId(elementId);
    setShowAddLabelModal(true);
    handleCloseElementContextMenu();
  };

  const handleAxisContextMenu = (axis: 'x' | 'y', x: number, y: number) => {
    setAxisContextMenu({ axis, x, y });
  };

  const handleCloseAxisContextMenu = () => {
    setAxisContextMenu(null);
  };

  const handleOpenAddAxisLabelModal = (axis: 'x' | 'y') => {
    // Store axis info in a way the modal can access
    // We'll use a special element ID to indicate it's an axis: -1 for x-axis, -2 for y-axis
    setLabelModalElementId(axis === 'x' ? -1 : -2);
    setShowAddLabelModal(true);
    handleCloseAxisContextMenu();
  };

  const handleOpenAddIntersectionLabelModal = (intersectionIndex: number) => {
    setLabelModalIntersectionIndex(intersectionIndex);
    setShowAddLabelModal(true);
    handleCloseIntersectionContextMenu();
  };

  const handleFillAreaContextMenu = (fillAreaIndex: number, x: number, y: number) => {
    setFillAreaContextMenu({ fillAreaIndex, x, y });
  };

  const handleCloseFillAreaContextMenu = () => {
    setFillAreaContextMenu(null);
  };

  const handleCloseAddLabelModal = () => {
    setShowAddLabelModal(false);
    setLabelModalElementId(null);
    setLabelModalIntersectionIndex(null);
  };

  const handleAddLabel = (text: string) => {
    if (!canvasRef.current) return;

    // Check if this is an intersection label
    if (labelModalIntersectionIndex !== null) {
      const intersection = intersectionPoints[labelModalIntersectionIndex];
      if (intersection) {
        const newLabel: IntersectionLabel = {
          intersectionIndex: labelModalIntersectionIndex,
          text: text,
          offsetX: 10,
          offsetY: -10,
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14,
          color: '#9B59B6'
        };
        handleLabelsChange({
          ...labels,
          intersectionLabels: [...labels.intersectionLabels, newLabel]
        }, true);
      }
      return;
    }

    if (labelModalElementId === null) return;

    // Check if this is an axis label (special IDs: -1 for x-axis, -2 for y-axis)
    if (labelModalElementId === -1 || labelModalElementId === -2) {
      const isXAxis = labelModalElementId === -1;
      const newLabels = {
        ...labels,
        axisLabels: {
          ...labels.axisLabels,
          ...(isXAxis ? { xLabel: text } : { yLabel: text })
        }
      };

      setLabels(newLabels);
      if (canvasRef.current) {
        canvasRef.current.updateLabels(newLabels, true);
      }
      return;
    }

    // Regular element label
    const element = canvasRef.current.getElements()[labelModalElementId];
    if (!element) return;

    // Calculate reference point for label based on element type
    let refPoint: Point;
    if (element.type === 'point') {
      refPoint = element.points[0];
    } else if (element.type === 'line' || element.type === 'bezier') {
      refPoint = {
        x: (element.points[0].x + element.points[1].x) / 2,
        y: (element.points[0].y + element.points[1].y) / 2
      };
    } else {
      refPoint = element.points[Math.floor(element.points.length / 2)];
    }

    // Create new element label
    const newElementLabel = {
      elementId: labelModalElementId,
      text: text,
      offsetX: 15, // Default offset from element
      offsetY: -15,
      fontFamily: 'JetBrains Mono',
      fontSize: 14,
      color: element.color,
      anchorPoint: 'start' as const
    };

    const newLabels = {
      ...labels,
      elementLabels: [...labels.elementLabels, newElementLabel]
    };

    setLabels(newLabels);
    if (canvasRef.current) {
      canvasRef.current.updateLabels(newLabels, true);
    }
  };

  const handleLabelsChange = (newLabels: GraphLabels, addToHistory: boolean = false) => {
    setLabels(newLabels);
    if (canvasRef.current) {
      canvasRef.current.updateLabels(newLabels, addToHistory);
    }
  };

  const handleTextBoxSelect = (id: string) => {
    if (canvasRef.current) {
      canvasRef.current.selectTextBox(id);
    }
  };

  const handleCanvasLabelsChange = (newLabels: GraphLabels) => {
    // Update page state when labels change from canvas interactions
    setLabels(newLabels);
  };

  // Calculate canGroup and canUngroup from state
  const isAnySelectedInGroup = Array.from(currentSelection.elementIds).some(id =>
    currentGroups.some(g => g.memberIds.includes(id))
  );

  const canGroup = hasSelection &&
    currentSelection.elementIds.size >= 2 &&
    !isAnySelectedInGroup;

  const canUngroup = hasSelection && isAnySelectedInGroup;

  const modeHints: Record<DrawMode, string> = {
    select: 'Click an element to select it. Drag to move, drag a point to edit.',
    point: 'Click to place a point, or enter coordinates.',
    line: 'Click two points, or enter coordinates.',
    bezier: 'Click the two endpoints, then drag the control point.',
    freehand: 'Click and drag to draw.',
    function: 'Enter a formula f(x) to plot it.',
    fill: 'Click boundary points to create a filled area.',
    textbox: 'Click empty space to add a text box. Drag a box to move it, or a corner to resize.',
  };

  return (
    <div className="flex flex-col h-dvh">
      <AppHeader
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={handleExport}
        onExportJPEG={handleExportJPEG}
        onExportPDF={handleExportPDF}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onDelete={handleDelete}
        hasSelection={hasSelection}
        onGroup={handleGroup}
        onUngroup={handleUngroup}
        canGroup={canGroup}
        canUngroup={canUngroup}
        onClear={handleClear}
        onResetToDefault={handleResetToDefault}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onOpenGuide={() => setShowQuickGuide(true)}
        onOpenMenu={() => setMobileDrawerOpen(true)}
      />

      <MobileDrawer isOpen={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)}>
        <CollapsiblePanel id="toolbar" title="Tools" defaultExpanded={true}>
          <Toolbar
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid(!showGrid)}
            showAxisUnits={showAxisUnits}
            onToggleAxisUnits={() => setShowAxisUnits(!showAxisUnits)}
            showOnlyPositive={showOnlyPositive}
            onToggleOnlyPositive={() => setShowOnlyPositive(!showOnlyPositive)}
            strokeColor={strokeColor}
            onStrokeColorChange={setStrokeColor}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            lineStyle={lineStyle}
            onLineStyleChange={setLineStyle}
            opacity={opacity}
            onOpacityChange={setOpacity}
            arrowType={arrowType}
            onArrowTypeChange={setArrowType}
            arrowSize={arrowSize}
            onArrowSizeChange={setArrowSize}
            curveType={curveType}
            onCurveTypeChange={setCurveType}
            drawMode={drawMode}
            onDrawModeChange={setDrawMode}
          />
        </CollapsiblePanel>

        <CollapsiblePanel id="labels" title="Labels & Text" defaultExpanded={true}>
          <LabelControls
            labels={labels}
            onLabelsChange={handleLabelsChange}
            elements={elements}
            intersectionPoints={intersectionPoints}
            onCharacterPaletteOpen={() => setShowCharacterPalette(true)}
            onTextBoxSelect={handleTextBoxSelect}
          />
        </CollapsiblePanel>

        <CollapsiblePanel id="fill" title="Fill Areas" defaultExpanded={true}>
          <FillAreaEditor
            fillAreas={fillAreas}
            onColorChange={handleFillColorChange}
            onOpacityChange={handleFillOpacityChange}
            onDelete={handleFillDelete}
            onEditBoundary={handleEditBoundary}
          />
        </CollapsiblePanel>

        <CollapsiblePanel id="scale" title="Scale" defaultExpanded={true}>
          <ScaleControls
            scale={scale}
            onScaleChange={setScale}
          />
        </CollapsiblePanel>
      </MobileDrawer>

      <div className="flex flex-1 min-h-0">
        <Sidebar onCollapseChange={setSidebarCollapsed}>
          <CollapsiblePanel id="toolbar" title="Tools" defaultExpanded={true}>
            <Toolbar
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid(!showGrid)}
              showAxisUnits={showAxisUnits}
              onToggleAxisUnits={() => setShowAxisUnits(!showAxisUnits)}
              showOnlyPositive={showOnlyPositive}
              onToggleOnlyPositive={() => setShowOnlyPositive(!showOnlyPositive)}
              strokeColor={strokeColor}
              onStrokeColorChange={setStrokeColor}
              strokeWidth={strokeWidth}
              onStrokeWidthChange={setStrokeWidth}
              lineStyle={lineStyle}
              onLineStyleChange={setLineStyle}
              opacity={opacity}
              onOpacityChange={setOpacity}
              arrowType={arrowType}
              onArrowTypeChange={setArrowType}
              arrowSize={arrowSize}
              onArrowSizeChange={setArrowSize}
              curveType={curveType}
              onCurveTypeChange={setCurveType}
              drawMode={drawMode}
              onDrawModeChange={setDrawMode}
            />
          </CollapsiblePanel>

          <CollapsiblePanel id="labels" title="Labels & Text" defaultExpanded={false}>
            <LabelControls
              labels={labels}
              onLabelsChange={handleLabelsChange}
              elements={elements}
              intersectionPoints={intersectionPoints}
              onCharacterPaletteOpen={() => setShowCharacterPalette(true)}
              onTextBoxSelect={handleTextBoxSelect}
            />
          </CollapsiblePanel>

          <CollapsiblePanel id="fill" title="Fill Areas" defaultExpanded={false}>
            <FillAreaEditor
              fillAreas={fillAreas}
              onColorChange={handleFillColorChange}
              onOpacityChange={handleFillOpacityChange}
              onDelete={handleFillDelete}
              onEditBoundary={handleEditBoundary}
            />
          </CollapsiblePanel>

          <CollapsiblePanel id="scale" title="Scale" defaultExpanded={true}>
            <ScaleControls
              scale={scale}
              onScaleChange={setScale}
            />
          </CollapsiblePanel>
        </Sidebar>

        <main className="flex flex-1 min-w-0 flex-col xl:flex-row overflow-y-auto xl:overflow-hidden">
          {/* Canvas column */}
          <div className="flex flex-col xl:flex-1 xl:min-w-0 xl:h-full">
            <div
              ref={containerRef}
              className="h-[62vh] min-h-[420px] xl:h-auto xl:flex-1 xl:min-h-0 p-3 overflow-hidden flex items-center justify-center"
            >
              <GraphCanvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                showGrid={showGrid}
                showAxisUnits={showAxisUnits}
                showOnlyPositive={showOnlyPositive}
                strokeColor={strokeColor}
                strokeWidth={strokeWidth}
                lineStyle={lineStyle}
                opacity={opacity}
                arrowType={arrowType}
                arrowSize={arrowSize}
                curveType={curveType}
                drawMode={drawMode}
                scale={scale}
                showIntersections={showIntersections}
                intersectionPoints={intersectionPoints}
                onCoordinateClick={handleCoordinateClick}
                onSelectionChange={handleSelectionChange}
                onElementsChange={handleElementsChange}
                onScaleChange={setScale}
                onLabelsChange={handleCanvasLabelsChange}
                onFillAreasChange={handleFillAreasChange}
                onIntersectionContextMenu={handleIntersectionContextMenu}
                onElementContextMenu={handleElementContextMenu}
                onAxisContextMenu={handleAxisContextMenu}
                onFillAreaContextMenu={handleFillAreaContextMenu}
              />
            </div>

            {/* Status bar */}
            <div
              className="flex shrink-0 items-center justify-between gap-4 bg-white"
              style={{
                height: 28,
                padding: '0 12px',
                borderTop: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              <span className="truncate">{modeHints[drawMode]}</span>
              <span className="hidden sm:inline shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
                {elementCount} elements · {Math.round(scale.x)} × {Math.round(scale.y)} px/unit
              </span>
            </div>
          </div>

          {/* Inspector */}
          <aside
            className="xl:w-[300px] xl:shrink-0 xl:overflow-y-auto border-t xl:border-t-0 xl:border-l bg-white"
            style={{ borderColor: 'var(--border)' }}
          >
            <section style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
                {drawMode === 'function' ? 'Function Plot' : 'Coordinates'}
              </h3>
              {drawMode === 'function' ? (
                <FunctionInput
                  onAddFunction={handleAddFunction}
                  strokeColor={strokeColor}
                  strokeWidth={strokeWidth}
                />
              ) : (
                <CoordinateInput
                  onAddLine={handleAddLineByCoordinates}
                  onAddPoint={handleAddPointByCoordinates}
                  currentPoint={currentPoint}
                  selectedElement={selectedElement}
                  selectedElementId={selectedElementId}
                  selectedElements={currentSelection.elementIds.size > 0 ?
                    Array.from(currentSelection.elementIds).map(id => ({
                      id,
                      element: elements[id]
                    })).filter(item => item.element) : undefined
                  }
                  onTogglePointProjection={handleTogglePointProjection}
                  showIntersections={showIntersections}
                  onToggleIntersections={handleToggleIntersections}
                  drawMode={drawMode}
                  elementCount={elementCount}
                />
              )}
            </section>

            {showIntersections && intersectionPoints.length > 0 && (
              <section style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    Intersections{' '}
                    <span className="field-value" style={{ color: 'var(--text-muted)' }}>
                      {intersectionPoints.filter(i => i.visible !== false).length}/{intersectionPoints.length}
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={handleShowAllIntersections} className="btn btn-sm">
                      Show all
                    </button>
                    <button onClick={handleHideAllIntersections} className="btn btn-sm">
                      Hide all
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {intersectionPoints.map((intersection, idx) => (
                    <div
                      key={idx}
                      className="card space-y-2"
                      style={{ opacity: intersection.visible === false ? 0.5 : 1 }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={intersection.visible !== false}
                            onChange={() => handleToggleIntersectionVisibility(idx)}
                            className="w-4 h-4 cursor-pointer"
                            style={{ accentColor: 'var(--intersect)' }}
                            aria-label={`Show point ${idx + 1}`}
                          />
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--intersect)' }}>
                            Point #{idx + 1}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                          El {intersection.elementId1} ∩ El {intersection.elementId2}
                        </span>
                      </div>
                      <span className="coord">
                        ({intersection.point.x.toFixed(2)}, {intersection.point.y.toFixed(2)})
                      </span>
                      <button
                        onClick={() => handleToggleIntersectionProjection(idx)}
                        className="btn btn-sm btn-block"
                        aria-pressed={!!intersection.showProjection}
                      >
                        {intersection.showProjection ? 'Hide projection' : 'Show projection'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </main>
      </div>

      {/* Intersection Context Menu */}
      {intersectionContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseIntersectionContextMenu}
          />
          <div
            className="menu fixed z-50"
            style={{
              left: `${intersectionContextMenu.x}px`,
              top: `${intersectionContextMenu.y}px`,
            }}
          >
            <button
              onClick={() => {
                const intersection = intersectionPoints[intersectionContextMenu.intersectionIndex];

                if (!showIntersections) {
                  // If Show Intersections is off, hide all points except this one, then enable
                  setIntersectionPoints(prev => prev.map((int, idx) => ({
                    ...int,
                    visible: idx === intersectionContextMenu.intersectionIndex ? true : false
                  })));
                  setShowIntersections(true);
                } else if (intersection?.visible === false) {
                  // If Show Intersections is on but this point is hidden, just show it
                  handleToggleIntersectionVisibility(intersectionContextMenu.intersectionIndex);
                } else {
                  // Otherwise hide this point
                  handleToggleIntersectionVisibility(intersectionContextMenu.intersectionIndex);
                }
                handleCloseIntersectionContextMenu();
              }}
              className="menu-item"
            >
              {showIntersections && intersectionPoints[intersectionContextMenu.intersectionIndex]?.visible !== false ? 'Hide point' : 'Show point'}
            </button>
            <button
              onClick={() => {
                // If Show Intersections is off, turn it on when showing projection
                if (!showIntersections) {
                  setShowIntersections(true);
                }
                handleToggleIntersectionProjection(intersectionContextMenu.intersectionIndex);
                handleCloseIntersectionContextMenu();
              }}
              className="menu-item"
            >
              {showIntersections && intersectionPoints[intersectionContextMenu.intersectionIndex]?.showProjection ? 'Hide projection' : 'Show projection'}
            </button>
            <button
              onClick={() => {
                handleOpenAddIntersectionLabelModal(intersectionContextMenu.intersectionIndex);
              }}
              className="menu-item"
            >
              Add label
            </button>
          </div>
        </>
      )}

      {/* Element Context Menu */}
      {elementContextMenu && canvasRef.current && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseElementContextMenu}
          />
          <div
            className="menu fixed z-50"
            style={{
              left: `${elementContextMenu.x}px`,
              top: `${elementContextMenu.y}px`,
            }}
          >
            {canvasRef.current.getElements()[elementContextMenu.elementId]?.type === 'point' && (
              <button
                onClick={() => {
                  handleTogglePointProjectionFromMenu(elementContextMenu.elementId);
                }}
                className="menu-item"
              >
                {canvasRef.current.getElements()[elementContextMenu.elementId]?.showProjection ? 'Hide projection' : 'Show projection'}
              </button>
            )}
            <button
              onClick={() => {
                handleOpenAddLabelModal(elementContextMenu.elementId);
              }}
              className="menu-item"
            >
              Add label
            </button>
          </div>
        </>
      )}

      {/* Axis Context Menu */}
      {axisContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseAxisContextMenu}
          />
          <div
            className="menu fixed z-50"
            style={{
              left: `${axisContextMenu.x}px`,
              top: `${axisContextMenu.y}px`,
            }}
          >
            <button
              onClick={() => {
                handleOpenAddAxisLabelModal(axisContextMenu.axis);
              }}
              className="menu-item"
            >
              Add label to {axisContextMenu.axis.toUpperCase()}-Axis
            </button>
          </div>
        </>
      )}

      {/* Fill Area Context Menu */}
      {fillAreaContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseFillAreaContextMenu}
          />
          <div
            className="menu fixed z-50"
            style={{
              left: `${fillAreaContextMenu.x}px`,
              top: `${fillAreaContextMenu.y}px`,
            }}
          >
            <button
              onClick={() => {
                handleFillDelete(fillAreaContextMenu.fillAreaIndex);
                handleCloseFillAreaContextMenu();
              }}
              className="menu-item danger"
            >
              Delete Fill Area
            </button>
          </div>
        </>
      )}

      {/* Add Label Modal */}
      <AddLabelModal
        isOpen={showAddLabelModal}
        onClose={handleCloseAddLabelModal}
        onAddLabel={handleAddLabel}
        elementId={labelModalElementId ?? 0}
        intersectionIndex={labelModalIntersectionIndex}
      />

      {/* Character Palette Modal */}
      <CharacterPalette
        isOpen={showCharacterPalette}
        onClose={() => setShowCharacterPalette(false)}
      />

      {/* Quick Guide Panel */}
      <QuickGuidePanel
        isOpen={showQuickGuide}
        onClose={() => setShowQuickGuide(false)}
      />
    </div>
  );
}
