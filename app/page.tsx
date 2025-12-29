'use client';

import { useState, useRef, useEffect } from 'react';
import GraphCanvas, { DrawMode, Point, GraphCanvasHandle, GraphElement } from './components/GraphCanvas';
import Toolbar from './components/Toolbar';
import ScaleControls from './components/ScaleControls';
import CoordinateInput from './components/CoordinateInput';
import FillAreaControls from './components/FillAreaControls';

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

  const handleClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
    }
  };

  const handleUndo = () => {
    console.log('handleUndo called');
    if (canvasRef.current) {
      canvasRef.current.undo();
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

  const handleCoordinateClick = (point: Point) => {
    setCurrentPoint(point);
  };

  const handleExport = () => {
    if (canvasRef.current) {
      canvasRef.current.exportToPNG();
    }
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
              onExport={handleExport}
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
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-80 lg:shrink-0 space-y-4 animate-slideInRight delay-300 order-3">
            <CoordinateInput
              onAddLine={handleAddLineByCoordinates}
              currentPoint={currentPoint}
              selectedElement={selectedElement}
              selectedElementId={selectedElementId}
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
    </div>
  );
}
