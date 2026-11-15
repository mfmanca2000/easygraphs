'use client';

import { useState } from 'react';
import { Trash2, Sigma, Plus } from 'lucide-react';
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

  const TABS: [typeof activeTab, string, string][] = [
    ['title', 'Title', 'Title'],
    ['axes', 'Axes', 'Axes'],
    ['elements', 'Elements', 'Elements'],
    ['intersections', 'Points', 'Intersections'],
    ['textboxes', 'Text boxes', 'Text boxes'],
  ];

  const paletteButton = (
    <button
      onClick={onCharacterPaletteOpen}
      className="btn btn-icon shrink-0"
      title="Open Character Palette"
      aria-label="Open Character Palette"
    >
      <Sigma size={16} />
    </button>
  );

  return (
    <div>
      {/* Tabs */}
      <div className="seg mb-4" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {TABS.map(([id, label, title]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="seg-item"
            style={{ flex: '1 1 auto' }}
            aria-pressed={activeTab === id}
            title={title}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* Title Tab */}
        {activeTab === 'title' && (
          <div className="space-y-4">
            <div>
              <label className="field-label">Title text</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={labels.title.text}
                  onChange={(e) => handleTitleChange('text', e.target.value)}
                  onBlur={handleTitleBlur}
                  placeholder="Enter graph title"
                  className="input"
                />
                {paletteButton}
              </div>
            </div>

            <div>
              <div className="field-label">
                <span>Font size</span>
                <span className="field-value">{labels.title.fontSize}px</span>
              </div>
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
              <label className="field-label">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={labels.title.color}
                  onChange={(e) => handleTitleChange('color', e.target.value)}
                  onBlur={handleTitleBlur}
                  className="color-input"
                />
                <span className="field-value">{labels.title.color.toUpperCase()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Axes Tab */}
        {activeTab === 'axes' && (
          <div className="space-y-4">
            <div>
              <label className="field-label">X-axis label</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={labels.axisLabels.xLabel}
                  onChange={(e) => handleAxisLabelChange('xLabel', e.target.value)}
                  onBlur={handleAxisBlur}
                  placeholder="e.g., Time (s)"
                  className="input"
                />
                {paletteButton}
              </div>
            </div>

            <div>
              <label className="field-label">Y-axis label</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={labels.axisLabels.yLabel}
                  onChange={(e) => handleAxisLabelChange('yLabel', e.target.value)}
                  onBlur={handleAxisBlur}
                  placeholder="e.g., Value"
                  className="input"
                />
                {paletteButton}
              </div>
            </div>

            <div>
              <div className="field-label">
                <span>Font size</span>
                <span className="field-value">{labels.axisLabels.fontSize}px</span>
              </div>
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
              <label className="field-label">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={labels.axisLabels.color}
                  onChange={(e) => handleAxisLabelChange('color', e.target.value)}
                  onBlur={handleAxisBlur}
                  className="color-input"
                />
                <span className="field-value">{labels.axisLabels.color.toUpperCase()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Elements Tab */}
        {activeTab === 'elements' && (
          <div className="space-y-4">
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Add labels to specific elements on the graph.
            </p>

            {elements.length === 0 ? (
              <div className="empty">No elements to label yet.</div>
            ) : (
              <div className="space-y-2">
                {elements.map((element, index) => {
                  const existingLabel = labels.elementLabels.find(l => l.elementId === index);
                  const existingLabelIndex = labels.elementLabels.findIndex(l => l.elementId === index);

                  return (
                    <div key={index} className="card">
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                          {element.type.charAt(0).toUpperCase() + element.type.slice(1)} #{index}
                        </span>
                        {existingLabel ? (
                          <button
                            onClick={() => handleRemoveElementLabel(existingLabelIndex)}
                            className="btn-link danger"
                          >
                            Remove label
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddElementLabel(index)}
                            className="btn-link"
                          >
                            Add label
                          </button>
                        )}
                      </div>

                      {existingLabel && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={existingLabel.text}
                            onChange={(e) => handleElementLabelChange(existingLabelIndex, 'text', e.target.value)}
                            onBlur={handleElementLabelBlur}
                            placeholder="Label text"
                            className="input"
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
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Add labels to intersection points.
            </p>

            {intersectionPoints.length === 0 ? (
              <div className="empty">
                No intersections found. Draw intersecting lines to create intersection points.
              </div>
            ) : (
              <div className="space-y-2">
                {intersectionPoints.map((intersection, index) => {
                  const existingLabel = labels.intersectionLabels.find(l => l.intersectionIndex === index);
                  const existingLabelIndex = labels.intersectionLabels.findIndex(l => l.intersectionIndex === index);

                  return (
                    <div key={index} className="card">
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--intersect)' }}>
                          Intersection #{index} ({intersection.point.x.toFixed(2)}, {intersection.point.y.toFixed(2)})
                        </span>
                        {existingLabel ? (
                          <button
                            onClick={() => handleRemoveIntersectionLabel(existingLabelIndex)}
                            className="btn-link danger shrink-0"
                          >
                            Remove label
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddIntersectionLabel(index)}
                            className="btn-link shrink-0"
                          >
                            Add label
                          </button>
                        )}
                      </div>

                      {existingLabel && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={existingLabel.text}
                            onChange={(e) => handleIntersectionLabelChange(existingLabelIndex, 'text', e.target.value)}
                            onBlur={handleIntersectionLabelBlur}
                            placeholder="Label text"
                            className="input"
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
            <button onClick={handleCreateTextBox} className="btn btn-primary btn-block">
              <Plus size={16} />
              Create text box
            </button>

            {labels.textBoxes.length === 0 ? (
              <div className="empty">No text boxes yet.</div>
            ) : (
              <div className="space-y-2">
                {labels.textBoxes.map((textBox) => (
                  <div
                    key={textBox.id}
                    className="card"
                    style={{
                      borderColor: editingTextBoxId === textBox.id ? 'var(--accent)' : 'var(--border)',
                      background: editingTextBoxId === textBox.id ? 'var(--accent-soft)' : 'var(--surface)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setEditingTextBoxId(editingTextBoxId === textBox.id ? null : textBox.id)}
                        className="text-left flex-1 min-w-0 truncate"
                        style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}
                      >
                        {textBox.text.substring(0, 30)}{textBox.text.length > 30 ? '...' : ''}
                      </button>
                      <button
                        onClick={() => handleDeleteTextBox(textBox.id)}
                        className="btn btn-ghost btn-icon btn-sm btn-danger"
                        title="Delete text box"
                        aria-label="Delete text box"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {editingTextBoxId === textBox.id && (
                      <div className="space-y-3 mt-3">
                        <div className="flex gap-2">
                          <textarea
                            value={textBox.text}
                            onChange={(e) => handleTextBoxChange(textBox.id, 'text', e.target.value)}
                            onBlur={handleTextBoxBlur}
                            rows={3}
                            className="input resize-none"
                          />
                          {paletteButton}
                        </div>

                        <div>
                          <div className="field-label">
                            <span>Font size</span>
                            <span className="field-value">{textBox.fontSize}px</span>
                          </div>
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

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="field-label">Text color</label>
                            <input
                              type="color"
                              value={textBox.color}
                              onChange={(e) => handleTextBoxChange(textBox.id, 'color', e.target.value)}
                              onBlur={handleTextBoxBlur}
                              className="color-input"
                            />
                          </div>
                          <div>
                            <label className="field-label">Border color</label>
                            <input
                              type="color"
                              value={textBox.borderColor}
                              onChange={(e) => handleTextBoxChange(textBox.id, 'borderColor', e.target.value)}
                              onBlur={handleTextBoxBlur}
                              className="color-input"
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
