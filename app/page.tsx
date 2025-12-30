'use client';

import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { HelpCircle, Menu } from 'lucide-react';
import GraphCanvas, { DrawMode, Point, GraphCanvasHandle, GraphElement, EasyGraphsExport, GraphLabels, DEFAULT_LABELS, IntersectionPoint } from './components/GraphCanvas';
import Toolbar from './components/Toolbar';
import ScaleControls from './components/ScaleControls';
import CoordinateInput from './components/CoordinateInput';
import FillAreaControls from './components/FillAreaControls';
import FunctionInput from './components/FunctionInput';
import LabelControls from './components/LabelControls';
import CharacterPalette from './components/CharacterPalette';
import QuickGuidePanel from './components/QuickGuidePanel';
import { CollapsiblePanel } from './components/CollapsiblePanel';
import { Sidebar } from './components/Sidebar';
import { MobileDrawer } from './components/MobileDrawer';
import ActionsPanel from './components/ActionsPanel';

export default function Home() {
  const canvasRef = useRef<GraphCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxisUnits, setShowAxisUnits] = useState(true);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [opacity, setOpacity] = useState(1);
  const [arrowType, setArrowType] = useState<'none' | 'end' | 'start' | 'both'>('none');
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

  // Recalculate intersections when elements change and intersection mode is on
  useEffect(() => {
    if (showIntersections && canvasRef.current) {
      const intersections = canvasRef.current.calculateAllIntersections();
      setIntersectionPoints(intersections);
    }
  }, [elements, showIntersections]);

  // Responsive canvas sizing - measure the actual container
  useEffect(() => {
    const updateCanvasSize = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Account for padding inside the container (p-4 = 16px, sm:p-6 = 24px)
      const padding = window.innerWidth >= 640 ? 48 : 32; // 24px * 2 or 16px * 2

      setCanvasSize({
        width: Math.max(400, containerWidth - padding),
        height: Math.max(400, containerHeight - padding)
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
        selectedElement.arrowType !== arrowType) {
        // Apply change without adding to history
        canvasRef.current.updateSelectedElement(strokeColor, strokeWidth, false, undefined, lineStyle, opacity, arrowType);
      }
    }

    // Note: selectedElement is intentionally excluded to avoid extra re-renders when the element updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeColor, strokeWidth, lineStyle, opacity, arrowType, selectedElementId]);

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
          currentState.arrowType !== originalElementRef.current.arrowType) {
          // Add a single modify action for all the changes made to the previous element
          canvasRef.current.addModifyAction(prevId, originalElementRef.current);
        }
      }
    }
  }, [selectedElementId]);

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

  const handleAddFill = (elementId: number, fillAbove: boolean, color: string, fillToAxis?: boolean) => {
    if (canvasRef.current) {
      canvasRef.current.addFillArea(elementId, fillAbove, color, fillToAxis);
    }
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
      // Calculate intersections when turning on
      const intersections = canvasRef.current.calculateAllIntersections();
      setIntersectionPoints(intersections);
    } else {
      // Clear intersections when turning off
      setIntersectionPoints([]);
    }
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

  return (
    <div className="min-h-screen relative" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="relative z-10 max-w-400 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fadeInUp relative">
          <div className="inline-block mb-4">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight" style={{
              color: 'var(--pencil-lead)',
              fontFamily: 'DM Sans, sans-serif',
              letterSpacing: '-0.02em'
            }}>
              EasyGraphs
            </h1>
            <div className="h-1 mt-2 rounded-full" style={{
              background: 'linear-gradient(90deg, var(--architect-blue), var(--architect-orange))',
              width: '100%'
            }}></div>
          </div>
          <button
            onClick={() => setShowQuickGuide(true)}
            className="absolute top-0 right-0 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{
              background: 'var(--architect-blue)',
              color: 'white',
              border: '2px solid transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--architect-orange)';
              e.currentTarget.style.borderColor = 'var(--architect-blue)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--architect-blue)';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            title="Quick Guide"
            aria-label="Open Quick Guide"
          >
            <HelpCircle size={20} />
          </button>
          <p className="text-lg" style={{ color: 'var(--architect-blue)', fontWeight: 500 }}>
            Your digital technical drawing workspace
          </p>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="fixed top-4 left-4 z-50 lg:hidden p-3 rounded-full shadow-lg transition-all hover:scale-110"
          style={{
            background: 'var(--architect-blue)',
            color: 'white',
          }}
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>

        {/* Mobile Drawer */}
        <MobileDrawer isOpen={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)}>
          <CollapsiblePanel id="toolbar" title="Drawing Tools" defaultExpanded={true}>
            <Toolbar
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid(!showGrid)}
              showAxisUnits={showAxisUnits}
              onToggleAxisUnits={() => setShowAxisUnits(!showAxisUnits)}
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
              onCharacterPaletteOpen={() => setShowCharacterPalette(true)}
              onTextBoxSelect={handleTextBoxSelect}
            />
          </CollapsiblePanel>

          <CollapsiblePanel id="fill" title="Fill Areas" defaultExpanded={true}>
            <FillAreaControls
              elementCount={elementCount}
              elements={elements}
              onAddFill={handleAddFill}
            />
          </CollapsiblePanel>

          <CollapsiblePanel id="scale" title="Scale Controls" defaultExpanded={true}>
            <ScaleControls
              scale={scale}
              onScaleChange={setScale}
              onResetPan={() => canvasRef.current?.resetPanOffset()}
            />
          </CollapsiblePanel>


          
          <CollapsiblePanel id="session" title="Session Info" defaultExpanded={true}>
            <div className="grid grid-cols-3 gap-3" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem' }}>
              <div className="text-center">
                <div style={{ color: 'var(--pencil-lead)', opacity: 0.6, fontSize: '0.75rem', marginBottom: '4px' }}>Elements</div>
                <div style={{
                  color: 'var(--architect-orange)',
                  fontWeight: 600,
                  fontSize: '1.25rem'
                }}>
                  {elementCount}
                </div>
              </div>
              <div className="text-center">
                <div style={{ color: 'var(--pencil-lead)', opacity: 0.6, fontSize: '0.75rem', marginBottom: '4px' }}>Mode</div>
                <div style={{
                  color: 'var(--architect-blue)',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  fontSize: '0.875rem'
                }}>
                  {drawMode}
                </div>
              </div>
              <div className="text-center">
                <div style={{ color: 'var(--pencil-lead)', opacity: 0.6, fontSize: '0.75rem', marginBottom: '4px' }}>Scale</div>
                <div style={{ color: 'var(--pencil-lead)', fontWeight: 600, fontSize: '0.875rem' }}>
                  {scale.x}×{scale.y}
                </div>
              </div>
            </div>
          </CollapsiblePanel>
        </MobileDrawer>

        {/* Main Layout */}
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <Sidebar onCollapseChange={setSidebarCollapsed}>
            <CollapsiblePanel id="toolbar" title="Drawing Tools" defaultExpanded={true}>
              <Toolbar
                showGrid={showGrid}
                onToggleGrid={() => setShowGrid(!showGrid)}
                showAxisUnits={showAxisUnits}
                onToggleAxisUnits={() => setShowAxisUnits(!showAxisUnits)}
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
                onCharacterPaletteOpen={() => setShowCharacterPalette(true)}
                onTextBoxSelect={handleTextBoxSelect}
              />
            </CollapsiblePanel>

            <CollapsiblePanel id="fill" title="Fill Areas" defaultExpanded={false}>
              <FillAreaControls
                elementCount={elementCount}
                elements={elements}
                onAddFill={handleAddFill}
              />
            </CollapsiblePanel>

            <CollapsiblePanel id="scale" title="Scale Controls" defaultExpanded={true}>
              <ScaleControls
                scale={scale}
                onScaleChange={setScale}
                onResetPan={() => canvasRef.current?.resetPanOffset()}
              />
            </CollapsiblePanel>



            <CollapsiblePanel id="session" title="Session Info" defaultExpanded={true}>
              <div className="space-y-2" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem' }}>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--pencil-lead)', opacity: 0.7 }}>Elements:</span>
                  <span style={{
                    color: 'var(--architect-orange)',
                    fontWeight: 600,
                    padding: '2px 8px',
                    background: 'rgba(230, 126, 34, 0.1)',
                    borderRadius: '4px'
                  }}>
                    {elementCount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--pencil-lead)', opacity: 0.7 }}>Mode:</span>
                  <span style={{
                    color: 'var(--architect-blue)',
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}>
                    {drawMode}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--pencil-lead)', opacity: 0.7 }}>Scale:</span>
                  <span style={{ color: 'var(--pencil-lead)', fontWeight: 600 }}>
                    {scale.x} × {scale.y}
                  </span>
                </div>
              </div>
            </CollapsiblePanel>
          </Sidebar>

          {/* Canvas Area - takes remaining space */}
          <main className="flex-1 animate-fadeInUp delay-200 space-y-4">
            {/* Actions Panel */}
            <div style={{
              width: '100%',
              maxWidth: '92%',
              margin: '0 auto 16px auto'
            }}>
              <ActionsPanel
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
              />
            </div>

            <div
              ref={containerRef}
              className="canvas-container rounded-lg p-4 sm:p-6"
              style={{
                width: '100%',
                maxWidth: '92%',
                height: 'calc(100vh - 650px)',
                minHeight: '400px',
                margin: '0 auto'
              }}
            >
              <div className="flex justify-center items-center h-full" style={{ overflow: 'hidden' }}>
                <GraphCanvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  showGrid={showGrid}
                  showAxisUnits={showAxisUnits}
                  strokeColor={strokeColor}
                  strokeWidth={strokeWidth}
                  lineStyle={lineStyle}
                  opacity={opacity}
                  arrowType={arrowType}
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
                />
              </div>
            </div>

            {/* Coordinates Panel - below canvas */}
            <div style={{
              width: '100%',
              maxWidth: '92%',
              margin: '16px auto 0 auto'
            }}>
              <div className="control-panel rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--architect-blue)' }}>
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
              </div>
            </div>

            {/* Intersections Panel - below coordinates */}
            {showIntersections && intersectionPoints.length > 0 && (
              <div style={{
                width: '100%',
                maxWidth: '92%',
                margin: '16px auto 0 auto'
              }}>
                <div className="control-panel rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: '#9B59B6' }}>
                    Intersections ({intersectionPoints.length})
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {intersectionPoints.map((intersection, idx) => (
                      <div key={idx} className="p-3 rounded-md" style={{
                        background: 'rgba(155, 89, 182, 0.05)',
                        border: '1px solid rgba(155, 89, 182, 0.3)'
                      }}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold" style={{ color: '#9B59B6' }}>
                            Point #{idx + 1}
                          </span>
                          <span className="text-xs" style={{
                            color: 'var(--pencil-lead)',
                            opacity: 0.6,
                            fontFamily: 'JetBrains Mono, monospace'
                          }}>
                            El {intersection.elementId1} ∩ El {intersection.elementId2}
                          </span>
                        </div>
                        <div className="px-3 py-2 rounded-md mb-2" style={{
                          background: 'rgba(155, 89, 182, 0.1)',
                          border: '1px solid rgba(155, 89, 182, 0.2)',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '0.875rem',
                          color: '#9B59B6',
                          fontWeight: 600
                        }}>
                          ({intersection.point.x.toFixed(2)}, {intersection.point.y.toFixed(2)})
                        </div>
                        <button
                          onClick={() => handleToggleIntersectionProjection(idx)}
                          className="w-full px-3 py-2 rounded-md text-sm font-medium transition-all"
                          style={{
                            background: intersection.showProjection ? '#9B59B6' : 'transparent',
                            color: intersection.showProjection ? 'white' : '#9B59B6',
                            border: `1.5px solid #9B59B6`
                          }}
                        >
                          {intersection.showProjection ? '✓ Hide' : '+ Show'} Projection
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center animate-fadeIn delay-400">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{
            background: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid var(--canvas-border)',
            color: 'var(--architect-blue)',
            fontSize: '0.875rem',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
              <path d="M8 2L8 14M2 8L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>Touch-enabled • Responsive • Precise</span>
          </div>
        </footer>
      </div>

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
