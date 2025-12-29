'use client';

import { useState, useRef, useEffect } from 'react';
import GraphCanvas, { DrawMode, Point, GraphCanvasHandle, GraphElement, EasyGraphsExport, GraphLabels, DEFAULT_LABELS } from './components/GraphCanvas';
import Toolbar from './components/Toolbar';
import ScaleControls from './components/ScaleControls';
import CoordinateInput from './components/CoordinateInput';
import FillAreaControls from './components/FillAreaControls';
import FunctionInput from './components/FunctionInput';
import LabelControls from './components/LabelControls';
import CharacterPalette from './components/CharacterPalette';

export default function Home() {
  const canvasRef = useRef<GraphCanvasHandle>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxisUnits, setShowAxisUnits] = useState(true);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
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

  // Responsive canvas sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        // Mobile: full width minus padding
        setCanvasSize({ width: width - 64, height: (width - 64) * 0.75 });
      } else if (width < 1024) {
        // Tablet: stacked layout, use available width
        setCanvasSize({ width: Math.min(700, width - 96), height: Math.min(525, (width - 96) * 0.75) });
      } else if (width < 1440) {
        // Small desktop: 3-column layout, account for sidebars (320px each) + gaps (48px) + padding (64px)
        const availableWidth = width - 320 - 320 - 48 - 64;
        const canvasWidth = Math.min(600, Math.max(400, availableWidth));
        setCanvasSize({ width: canvasWidth, height: canvasWidth * 0.75 });
      } else {
        // Large desktop: full 800px canvas
        const availableWidth = width - 320 - 320 - 48 - 64;
        const canvasWidth = Math.min(800, Math.max(600, availableWidth));
        setCanvasSize({ width: canvasWidth, height: canvasWidth * 0.75 });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Update toolbar to match selected element's properties and save original state
  useEffect(() => {
    if (selectedElement && selectedElementId !== null) {
      setStrokeColor(selectedElement.color);
      setStrokeWidth(selectedElement.lineWidth);
      // Save original state when a new element is selected
      originalElementRef.current = { ...selectedElement };
    } else if (selectedElementId === null) {
      // Selection cleared - finalize any pending edits
      if (originalElementRef.current && canvasRef.current) {
        const prevElementId = elements.findIndex(el =>
          el.color === originalElementRef.current!.color &&
          el.lineWidth === originalElementRef.current!.lineWidth
        );
        // Check if we need to add the final edit to history
        // (this is handled when selection actually changes, not here)
      }
      originalElementRef.current = null;
    }
  }, [selectedElement, selectedElementId, elements]);

  // Apply toolbar changes to selected element in real-time (without adding to history yet)
  useEffect(() => {
    if (selectedElementId !== null && canvasRef.current && selectedElement && originalElementRef.current) {
      // Check if values actually changed from current element state
      if (selectedElement.color !== strokeColor || selectedElement.lineWidth !== strokeWidth) {
        // Apply change without adding to history
        canvasRef.current.updateSelectedElement(strokeColor, strokeWidth, false);
      }
    }
  }, [strokeColor, strokeWidth, selectedElementId, selectedElement]);

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
            currentState.lineWidth !== originalElementRef.current.lineWidth) {
          // Add a single modify action for all the changes made to the previous element
          canvasRef.current.addModifyAction(prevId, originalElementRef.current);
        }
      }
    }
  }, [selectedElementId]);

  const handleClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
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

  const handleAddLineByCoordinates = (start: Point, end: Point) => {
    if (canvasRef.current) {
      canvasRef.current.addLineByCoordinates(start, end);
    }
  };

  const handleAddFill = (elementId: number, fillAbove: boolean, color: string, fillToAxis?: boolean) => {
    if (canvasRef.current) {
      canvasRef.current.addFillArea(elementId, fillAbove, color, fillToAxis);
    }
  };

  const handleAddFunction = (formula: string, xMin: number, xMax: number, color: string, lineWidth: number) => {
    if (canvasRef.current) {
      canvasRef.current.addFunction(formula, xMin, xMax, color, lineWidth);
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
        labels: canvasData.labels
      },
      settings: {
        strokeColor,
        strokeWidth,
        drawMode
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
            labels: importData.drawing.labels || DEFAULT_LABELS
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

  return (
    <div className="min-h-screen relative" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="relative z-10 max-w-400 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fadeInUp">
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
          <p className="text-lg" style={{ color: 'var(--architect-blue)', fontWeight: 500 }}>
            Your digital technical drawing workspace
          </p>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* Left Sidebar */}
          <aside className="w-full lg:w-80 lg:shrink-0 space-y-4 animate-slideInLeft delay-100 order-2 lg:order-1">
            <Toolbar
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid(!showGrid)}
              showAxisUnits={showAxisUnits}
              onToggleAxisUnits={() => setShowAxisUnits(!showAxisUnits)}
              strokeColor={strokeColor}
              onStrokeColorChange={setStrokeColor}
              strokeWidth={strokeWidth}
              onStrokeWidthChange={setStrokeWidth}
              drawMode={drawMode}
              onDrawModeChange={setDrawMode}
              onClear={handleClear}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onExport={handleExport}
              onExportJSON={handleExportJSON}
              onImportJSON={handleImportJSON}
            />

            <ScaleControls
              scale={scale}
              onScaleChange={setScale}
            />

            {/* Info Panel - Desktop only */}
            <div className="control-panel rounded-lg p-4 hidden lg:block">
              <h3 className="text-sm font-semibold mb-3" style={{
                color: 'var(--architect-blue)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                Session Info
              </h3>
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
            </div>
          </aside>

          {/* Center - Canvas Area */}
          <main className="w-full lg:w-auto lg:flex-1 lg:min-w-0 lg:max-w-full animate-fadeInUp delay-200 order-1 lg:order-2">
            <div className="canvas-container rounded-lg p-4 sm:p-6">
              <div className="overflow-x-auto flex justify-center">
                <GraphCanvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  showGrid={showGrid}
                  showAxisUnits={showAxisUnits}
                  strokeColor={strokeColor}
                  strokeWidth={strokeWidth}
                  drawMode={drawMode}
                  scale={scale}
                  onCoordinateClick={handleCoordinateClick}
                  onSelectionChange={handleSelectionChange}
                  onElementsChange={handleElementsChange}
                  onScaleChange={setScale}
                  onLabelsChange={handleCanvasLabelsChange}
                />
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 rounded-lg" style={{
                background: 'linear-gradient(135deg, rgba(43, 95, 130, 0.05), rgba(230, 126, 34, 0.05))',
                border: '1px solid var(--graph-lines)'
              }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{
                    background: 'var(--architect-blue)',
                    color: 'white'
                  }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem', fontWeight: 600 }}>?</span>
                  </div>
                  <div>
                    <p className="font-semibold mb-2" style={{ color: 'var(--pencil-lead)' }}>Quick Guide</p>
                    <ul className="space-y-1.5 text-sm" style={{ color: 'var(--pencil-lead)', opacity: 0.8 }}>
                      <li className="flex items-start gap-2">
                        <span style={{ color: 'var(--architect-orange)', fontWeight: 600 }}>→</span>
                        <span><strong>Select:</strong> Click to select, drag points to edit</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: 'var(--architect-blue)', fontWeight: 600 }}>→</span>
                        <span><strong>Line:</strong> Click two points or enter coordinates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: 'var(--architect-orange)', fontWeight: 600 }}>→</span>
                        <span><strong>Bezier:</strong> Click endpoints, drag control point</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: 'var(--architect-green)', fontWeight: 600 }}>→</span>
                        <span><strong>Freehand:</strong> Click and drag to draw smoothly</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: 'var(--architect-blue)', fontWeight: 600 }}>→</span>
                        <span><strong>Function:</strong> Enter f(x) formula to plot graphs</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: 'var(--architect-orange)', fontWeight: 600 }}>→</span>
                        <span><strong>Pan:</strong> Hold CTRL + drag to move the canvas</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: 'var(--architect-green)', fontWeight: 600 }}>→</span>
                        <span><strong>Zoom:</strong> Scroll mouse wheel to zoom in/out</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-80 lg:shrink-0 space-y-4 animate-slideInRight delay-300 order-3">
            {drawMode === 'function' ? (
              <FunctionInput
                onAddFunction={handleAddFunction}
                strokeColor={strokeColor}
                strokeWidth={strokeWidth}
              />
            ) : (
              <CoordinateInput
                onAddLine={handleAddLineByCoordinates}
                currentPoint={currentPoint}
                selectedElement={selectedElement}
                selectedElementId={selectedElementId}
                onTogglePointProjection={handleTogglePointProjection}
              />
            )}

            <LabelControls
              labels={labels}
              onLabelsChange={handleLabelsChange}
              elements={elements}
              onCharacterPaletteOpen={() => setShowCharacterPalette(true)}
              onTextBoxSelect={handleTextBoxSelect}
            />

            <FillAreaControls
              elementCount={elementCount}
              elements={elements}
              onAddFill={handleAddFill}
            />

            {/* Mobile Info Panel */}
            <div className="control-panel rounded-lg p-4 lg:hidden">
              <h3 className="text-sm font-semibold mb-3" style={{
                color: 'var(--architect-blue)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                Session Info
              </h3>
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
            </div>
          </aside>
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
              <path d="M8 2L8 14M2 8L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
    </div>
  );
}
