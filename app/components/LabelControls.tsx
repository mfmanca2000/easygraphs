'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { GraphLabels, GraphElement, ElementLabel, TextBox, IntersectionPoint, IntersectionLabel } from '@/app/types/canvas';
import { Slider } from './ui/slider';

interface LabelControlsProps {
  labels: GraphLabels;
  onLabelsChange: (labels: GraphLabels, addToHistory?: boolean) => void;
  elements: GraphElement[];
  intersectionPoints: IntersectionPoint[];
  onCharacterPaletteOpen: () => void;
  onTextBoxSelect?: (id: string) => void;
}

type Tab = 'title' | 'axes' | 'elements' | 'intersections' | 'textboxes';

export default function LabelControls({
  labels,
  onLabelsChange,
  elements,
  intersectionPoints,
  onCharacterPaletteOpen,
  onTextBoxSelect
}: LabelControlsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('title');
  const [editingTextBoxId, setEditingTextBoxId] = useState<string | null>(null);

  const handleTitleChange = (field: keyof GraphLabels['title'], value: string | number) => {
    onLabelsChange({
      ...labels,
      title: {
        ...labels.title,
        [field]: value
      }
    });
  };

  const handleTitleBlur = () => {
    onLabelsChange(labels, true); // Add to history on blur
  };

  const handleAxisLabelChange = (field: keyof GraphLabels['axisLabels'], value: string | number) => {
    onLabelsChange({
      ...labels,
      axisLabels: {
        ...labels.axisLabels,
        [field]: value
      }
    });
  };

  const handleAxisBlur = () => {
    onLabelsChange(labels, true); // Add to history on blur
  };

  const handleAddElementLabel = (elementId: number) => {
    const newLabel: ElementLabel = {
      elementId,
      text: `Element ${elementId}`,
      offsetX: 10,
      offsetY: -10,
      fontFamily: 'DM Sans, sans-serif',
      fontSize: 14,
      color: elements[elementId]?.color || '#1A2332'
    };

    onLabelsChange({
      ...labels,
      elementLabels: [...labels.elementLabels, newLabel]
    }, true);
  };

  const handleRemoveElementLabel = (index: number) => {
    onLabelsChange({
      ...labels,
      elementLabels: labels.elementLabels.filter((_, i) => i !== index)
    }, true);
  };

  const handleElementLabelChange = (index: number, field: keyof ElementLabel, value: string | number) => {
    const updatedLabels = [...labels.elementLabels];
    updatedLabels[index] = {
      ...updatedLabels[index],
      [field]: value
    };
    onLabelsChange({
      ...labels,
      elementLabels: updatedLabels
    });
  };

  const handleElementLabelBlur = () => {
    onLabelsChange(labels, true);
  };

  const handleAddIntersectionLabel = (intersectionIndex: number) => {
    const intersection = intersectionPoints[intersectionIndex];
    if (!intersection) return;

    const newLabel: IntersectionLabel = {
      intersectionIndex,
      text: `(${intersection.point.x.toFixed(2)}, ${intersection.point.y.toFixed(2)})`,
      offsetX: 10,
      offsetY: -10,
      fontFamily: 'DM Sans, sans-serif',
      fontSize: 14,
      color: '#9B59B6'
    };

    onLabelsChange({
      ...labels,
      intersectionLabels: [...labels.intersectionLabels, newLabel]
    }, true);
  };

  const handleRemoveIntersectionLabel = (index: number) => {
    onLabelsChange({
      ...labels,
      intersectionLabels: labels.intersectionLabels.filter((_, i) => i !== index)
    }, true);
  };

  const handleIntersectionLabelChange = (index: number, field: keyof IntersectionLabel, value: string | number) => {
    const updatedLabels = [...labels.intersectionLabels];
    updatedLabels[index] = {
      ...updatedLabels[index],
      [field]: value
    };
    onLabelsChange({
      ...labels,
      intersectionLabels: updatedLabels
    });
  };

  const handleIntersectionLabelBlur = () => {
    onLabelsChange(labels, true);
  };

  const handleCreateTextBox = () => {
    const newTextBox: TextBox = {
      id: crypto.randomUUID(),
      text: 'New Text Box',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      fontFamily: 'DM Sans, sans-serif',
      fontSize: 14,
      color: '#1A2332',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#2B5F82',
      borderWidth: 2,
      padding: 10,
      coordinateSystem: 'canvas'
    };

    onLabelsChange({
      ...labels,
      textBoxes: [...labels.textBoxes, newTextBox]
    }, true);
    setEditingTextBoxId(newTextBox.id);

    // Notify parent to select this text box in the canvas
    if (onTextBoxSelect) {
      onTextBoxSelect(newTextBox.id);
    }
  };

  const handleDeleteTextBox = (id: string) => {
    onLabelsChange({
      ...labels,
      textBoxes: labels.textBoxes.filter(tb => tb.id !== id)
    }, true);
    if (editingTextBoxId === id) {
      setEditingTextBoxId(null);
    }
  };

  const handleTextBoxChange = (id: string, field: keyof TextBox, value: string | number) => {
    const updatedTextBoxes = labels.textBoxes.map(tb =>
      tb.id === id ? { ...tb, [field]: value } : tb
    );
    onLabelsChange({
      ...labels,
      textBoxes: updatedTextBoxes
    });
  };

  const handleTextBoxBlur = () => {
    onLabelsChange(labels, true);
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex mb-4" style={{ borderBottom: '1.5px solid var(--canvas-border)' }}>
        <button
          onClick={() => setActiveTab('title')}
          className="flex-1 px-3 py-2 text-sm font-medium transition-colors"
          style={{
            color: activeTab === 'title' ? 'var(--architect-blue)' : 'var(--pencil-lead)',
            borderBottom: activeTab === 'title' ? '2px solid var(--architect-blue)' : 'none',
            opacity: activeTab === 'title' ? 1 : 0.6,
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          Title
        </button>
        <button
          onClick={() => setActiveTab('axes')}
          className="flex-1 px-3 py-2 text-sm font-medium transition-colors"
          style={{
            color: activeTab === 'axes' ? 'var(--architect-blue)' : 'var(--pencil-lead)',
            borderBottom: activeTab === 'axes' ? '2px solid var(--architect-blue)' : 'none',
            opacity: activeTab === 'axes' ? 1 : 0.6,
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          Axes
        </button>
        <button
          onClick={() => setActiveTab('elements')}
          className="flex-1 px-3 py-2 text-sm font-medium transition-colors"
          style={{
            color: activeTab === 'elements' ? 'var(--architect-blue)' : 'var(--pencil-lead)',
            borderBottom: activeTab === 'elements' ? '2px solid var(--architect-blue)' : 'none',
            opacity: activeTab === 'elements' ? 1 : 0.6,
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          Elements
        </button>
        <button
          onClick={() => setActiveTab('intersections')}
          className="flex-1 px-3 py-2 text-sm font-medium transition-colors"
          style={{
            color: activeTab === 'intersections' ? 'var(--architect-blue)' : 'var(--pencil-lead)',
            borderBottom: activeTab === 'intersections' ? '2px solid var(--architect-blue)' : 'none',
            opacity: activeTab === 'intersections' ? 1 : 0.6,
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          Intersections
        </button>
        <button
          onClick={() => setActiveTab('textboxes')}
          className="flex-1 px-3 py-2 text-sm font-medium transition-colors"
          style={{
            color: activeTab === 'textboxes' ? 'var(--architect-blue)' : 'var(--pencil-lead)',
            borderBottom: activeTab === 'textboxes' ? '2px solid var(--architect-blue)' : 'none',
            opacity: activeTab === 'textboxes' ? 1 : 0.6,
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          Text Boxes
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {/* Title Tab */}
        {activeTab === 'title' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
                Title Text
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={labels.title.text}
                  onChange={(e) => handleTitleChange('text', e.target.value)}
                  onBlur={handleTitleBlur}
                  placeholder="Enter graph title"
                  className="flex-1 px-3 py-2 text-sm rounded-md focus:outline-none"
                  style={{
                    border: '1.5px solid var(--canvas-border)',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--pencil-lead)'
                  }}
                />
                <button
                  onClick={onCharacterPaletteOpen}
                  className="px-3 py-2 rounded-md text-lg transition-all"
                  style={{
                    background: 'transparent',
                    border: '1.5px solid var(--canvas-border)',
                    color: 'var(--pencil-lead)'
                  }}
                  title="Open Character Palette"
                >
                  Σ
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
                Font Size
                <span className="ml-2 font-mono" style={{ color: 'var(--architect-orange)' }}>
                  {labels.title.fontSize}px
                </span>
              </label>
              <Slider
                min={12}
                max={48}
                step={1}
                value={[labels.title.fontSize]}
                onValueChange={(value) => handleTitleChange('fontSize', value[0])}
                onValueCommit={handleTitleBlur}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
                Color
              </label>
              <input
                type="color"
                value={labels.title.color}
                onChange={(e) => handleTitleChange('color', e.target.value)}
                onBlur={handleTitleBlur}
                className="w-full h-10 rounded-md cursor-pointer"
                style={{ border: '1.5px solid var(--canvas-border)' }}
              />
            </div>
          </div>
        )}

        {/* Axes Tab */}
        {activeTab === 'axes' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
                X-Axis Label
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={labels.axisLabels.xLabel}
                  onChange={(e) => handleAxisLabelChange('xLabel', e.target.value)}
                  onBlur={handleAxisBlur}
                  placeholder="e.g., Time (s)"
                  className="flex-1 px-3 py-2 text-sm rounded-md focus:outline-none"
                  style={{
                    border: '1.5px solid var(--canvas-border)',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--pencil-lead)'
                  }}
                />
                <button
                  onClick={onCharacterPaletteOpen}
                  className="px-3 py-2 rounded-md text-lg transition-all"
                  style={{
                    background: 'transparent',
                    border: '1.5px solid var(--canvas-border)',
                    color: 'var(--pencil-lead)'
                  }}
                  title="Open Character Palette"
                >
                  Σ
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
                Y-Axis Label
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={labels.axisLabels.yLabel}
                  onChange={(e) => handleAxisLabelChange('yLabel', e.target.value)}
                  onBlur={handleAxisBlur}
                  placeholder="e.g., Value"
                  className="flex-1 px-3 py-2 text-sm rounded-md focus:outline-none"
                  style={{
                    border: '1.5px solid var(--canvas-border)',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--pencil-lead)'
                  }}
                />
                <button
                  onClick={onCharacterPaletteOpen}
                  className="px-3 py-2 rounded-md text-lg transition-all"
                  style={{
                    background: 'transparent',
                    border: '1.5px solid var(--canvas-border)',
                    color: 'var(--pencil-lead)'
                  }}
                  title="Open Character Palette"
                >
                  Σ
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
                Font Size
                <span className="ml-2 font-mono" style={{ color: 'var(--architect-orange)' }}>
                  {labels.axisLabels.fontSize}px
                </span>
              </label>
              <Slider
                min={10}
                max={24}
                step={1}
                value={[labels.axisLabels.fontSize]}
                onValueChange={(value) => handleAxisLabelChange('fontSize', value[0])}
                onValueCommit={handleAxisBlur}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
                Color
              </label>
              <input
                type="color"
                value={labels.axisLabels.color}
                onChange={(e) => handleAxisLabelChange('color', e.target.value)}
                onBlur={handleAxisBlur}
                className="w-full h-10 rounded-md cursor-pointer"
                style={{ border: '1.5px solid var(--canvas-border)' }}
              />
            </div>
          </div>
        )}

        {/* Elements Tab */}
        {activeTab === 'elements' && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--pencil-lead)', opacity: 0.7 }}>
              Add labels to specific elements on the graph.
            </p>

            {elements.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--pencil-lead)', opacity: 0.5 }}>
                No elements to label yet.
              </p>
            ) : (
              <div className="space-y-2">
                {elements.map((element, index) => {
                  const existingLabel = labels.elementLabels.find(l => l.elementId === index);
                  const existingLabelIndex = labels.elementLabels.findIndex(l => l.elementId === index);

                  return (
                    <div
                      key={index}
                      className="p-3 rounded-md"
                      style={{ border: '1.5px solid var(--canvas-border)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{
                          color: 'var(--architect-blue)',
                          fontFamily: 'JetBrains Mono, monospace'
                        }}>
                          {element.type.charAt(0).toUpperCase() + element.type.slice(1)} #{index}
                        </span>
                        {existingLabel ? (
                          <button
                            onClick={() => handleRemoveElementLabel(existingLabelIndex)}
                            className="text-xs font-medium"
                            style={{ color: '#E74C3C' }}
                          >
                            Remove Label
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddElementLabel(index)}
                            className="text-xs font-medium"
                            style={{ color: 'var(--architect-blue)' }}
                          >
                            Add Label
                          </button>
                        )}
                      </div>

                      {existingLabel && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={existingLabel.text}
                            onChange={(e) => handleElementLabelChange(existingLabelIndex, 'text', e.target.value)}
                            onBlur={handleElementLabelBlur}
                            placeholder="Label text"
                            className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
                            style={{
                              border: '1.5px solid var(--canvas-border)',
                              fontFamily: 'JetBrains Mono, monospace',
                              color: 'var(--pencil-lead)'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Intersections Tab */}
        {activeTab === 'intersections' && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--pencil-lead)', opacity: 0.7 }}>
              Add labels to intersection points.
            </p>

            {intersectionPoints.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--pencil-lead)', opacity: 0.5 }}>
                No intersections found. Draw intersecting lines to create intersection points.
              </p>
            ) : (
              <div className="space-y-2">
                {intersectionPoints.map((intersection, index) => {
                  const existingLabel = labels.intersectionLabels.find(l => l.intersectionIndex === index);
                  const existingLabelIndex = labels.intersectionLabels.findIndex(l => l.intersectionIndex === index);

                  return (
                    <div
                      key={index}
                      className="p-3 rounded-md"
                      style={{ border: '1.5px solid var(--canvas-border)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{
                          color: '#9B59B6',
                          fontFamily: 'JetBrains Mono, monospace'
                        }}>
                          Intersection #{index} ({intersection.point.x.toFixed(2)}, {intersection.point.y.toFixed(2)})
                        </span>
                        {existingLabel ? (
                          <button
                            onClick={() => handleRemoveIntersectionLabel(existingLabelIndex)}
                            className="text-xs font-medium"
                            style={{ color: '#E74C3C' }}
                          >
                            Remove Label
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddIntersectionLabel(index)}
                            className="text-xs font-medium"
                            style={{ color: '#9B59B6' }}
                          >
                            Add Label
                          </button>
                        )}
                      </div>

                      {existingLabel && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={existingLabel.text}
                            onChange={(e) => handleIntersectionLabelChange(existingLabelIndex, 'text', e.target.value)}
                            onBlur={handleIntersectionLabelBlur}
                            placeholder="Label text"
                            className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
                            style={{
                              border: '1.5px solid var(--canvas-border)',
                              fontFamily: 'JetBrains Mono, monospace',
                              color: 'var(--pencil-lead)'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Text Boxes Tab */}
        {activeTab === 'textboxes' && (
          <div className="space-y-4">
            <button
              onClick={handleCreateTextBox}
              className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all"
              style={{
                background: 'var(--architect-green)',
                color: 'white',
                border: 'none'
              }}
            >
              + Create Text Box
            </button>

            {labels.textBoxes.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--pencil-lead)', opacity: 0.5 }}>
                No text boxes yet.
              </p>
            ) : (
              <div className="space-y-2">
                {labels.textBoxes.map((textBox) => (
                  <div
                    key={textBox.id}
                    className="p-3 rounded-md"
                    style={{
                      border: editingTextBoxId === textBox.id
                        ? '1.5px solid var(--architect-blue)'
                        : '1.5px solid var(--canvas-border)',
                      background: editingTextBoxId === textBox.id
                        ? 'rgba(43, 95, 130, 0.05)'
                        : 'transparent'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setEditingTextBoxId(editingTextBoxId === textBox.id ? null : textBox.id)}
                        className="text-sm font-medium text-left flex-1"
                        style={{
                          color: 'var(--architect-blue)',
                          fontFamily: 'JetBrains Mono, monospace'
                        }}
                      >
                        {textBox.text.substring(0, 30)}{textBox.text.length > 30 ? '...' : ''}
                      </button>
                      <button
                        onClick={() => handleDeleteTextBox(textBox.id)}
                        className="ml-2"
                        style={{ color: '#E74C3C' }}
                        title="Delete text box"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {editingTextBoxId === textBox.id && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <textarea
                            value={textBox.text}
                            onChange={(e) => handleTextBoxChange(textBox.id, 'text', e.target.value)}
                            onBlur={handleTextBoxBlur}
                            rows={3}
                            className="flex-1 px-3 py-2 text-sm rounded-md resize-none focus:outline-none"
                            style={{
                              border: '1.5px solid var(--canvas-border)',
                              fontFamily: 'JetBrains Mono, monospace',
                              color: 'var(--pencil-lead)'
                            }}
                          />
                          <button
                            onClick={onCharacterPaletteOpen}
                            className="px-2 rounded-md text-lg self-start transition-all"
                            style={{
                              background: 'transparent',
                              border: '1.5px solid var(--canvas-border)',
                              color: 'var(--pencil-lead)'
                            }}
                            title="Open Character Palette"
                          >
                            Σ
                          </button>
                        </div>

                        <div>
                          <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
                            Font Size
                            <span className="ml-2 font-mono" style={{ color: 'var(--architect-orange)' }}>
                              {textBox.fontSize}px
                            </span>
                          </label>
                          <Slider
                            min={10}
                            max={32}
                            step={1}
                            value={[textBox.fontSize]}
                            onValueChange={(value) => handleTextBoxChange(textBox.id, 'fontSize', value[0])}
                            onValueCommit={handleTextBoxBlur}
                            className="w-full"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium block mb-1.5" style={{
                              color: 'var(--pencil-lead)',
                              opacity: 0.7
                            }}>
                              Text Color
                            </label>
                            <input
                              type="color"
                              value={textBox.color}
                              onChange={(e) => handleTextBoxChange(textBox.id, 'color', e.target.value)}
                              onBlur={handleTextBoxBlur}
                              className="w-full h-8 rounded-md cursor-pointer"
                              style={{ border: '1.5px solid var(--canvas-border)' }}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium block mb-1.5" style={{
                              color: 'var(--pencil-lead)',
                              opacity: 0.7
                            }}>
                              Border Color
                            </label>
                            <input
                              type="color"
                              value={textBox.borderColor}
                              onChange={(e) => handleTextBoxChange(textBox.id, 'borderColor', e.target.value)}
                              onBlur={handleTextBoxBlur}
                              className="w-full h-8 rounded-md cursor-pointer"
                              style={{ border: '1.5px solid var(--canvas-border)' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
