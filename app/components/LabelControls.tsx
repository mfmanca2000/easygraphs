'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { GraphLabels, GraphElement, ElementLabel, TextBox } from './GraphCanvas';
import { Slider } from './ui/slider';

interface LabelControlsProps {
  labels: GraphLabels;
  onLabelsChange: (labels: GraphLabels, addToHistory?: boolean) => void;
  elements: GraphElement[];
  onCharacterPaletteOpen: () => void;
  onTextBoxSelect?: (id: string) => void;
}

type Tab = 'title' | 'axes' | 'elements' | 'textboxes';

export default function LabelControls({
  labels,
  onLabelsChange,
  elements,
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-linear-to-r from-blue-600 to-cyan-600 text-white">
        <h2 className="text-lg font-semibold">Labels & Text</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('title')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'title'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Title
        </button>
        <button
          onClick={() => setActiveTab('axes')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'axes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Axes
        </button>
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'elements'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Elements
        </button>
        <button
          onClick={() => setActiveTab('textboxes')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'textboxes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Text Boxes
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Title Tab */}
        {activeTab === 'title' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title Text
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={labels.title.text}
                  onChange={(e) => handleTitleChange('text', e.target.value)}
                  onBlur={handleTitleBlur}
                  placeholder="Enter graph title"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={onCharacterPaletteOpen}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-lg"
                  title="Open Character Palette"
                >
                  Σ
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Font Size: {labels.title.fontSize}px
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={labels.title.color}
                onChange={(e) => handleTitleChange('color', e.target.value)}
                onBlur={handleTitleBlur}
                className="w-full h-10 rounded border border-gray-300 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Axes Tab */}
        {activeTab === 'axes' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                X-Axis Label
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={labels.axisLabels.xLabel}
                  onChange={(e) => handleAxisLabelChange('xLabel', e.target.value)}
                  onBlur={handleAxisBlur}
                  placeholder="e.g., Time (s)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={onCharacterPaletteOpen}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-lg"
                  title="Open Character Palette"
                >
                  Σ
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Y-Axis Label
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={labels.axisLabels.yLabel}
                  onChange={(e) => handleAxisLabelChange('yLabel', e.target.value)}
                  onBlur={handleAxisBlur}
                  placeholder="e.g., Value"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={onCharacterPaletteOpen}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-lg"
                  title="Open Character Palette"
                >
                  Σ
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Font Size: {labels.axisLabels.fontSize}px
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={labels.axisLabels.color}
                onChange={(e) => handleAxisLabelChange('color', e.target.value)}
                onBlur={handleAxisBlur}
                className="w-full h-10 rounded border border-gray-300 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Elements Tab */}
        {activeTab === 'elements' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Add labels to specific elements on the graph.
            </p>

            {elements.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No elements to label yet.</p>
            ) : (
              <div className="space-y-2">
                {elements.map((element, index) => {
                  const existingLabel = labels.elementLabels.find(l => l.elementId === index);
                  const existingLabelIndex = labels.elementLabels.findIndex(l => l.elementId === index);

                  return (
                    <div key={index} className="p-3 border border-gray-200 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {element.type.charAt(0).toUpperCase() + element.type.slice(1)} #{index}
                        </span>
                        {existingLabel ? (
                          <button
                            onClick={() => handleRemoveElementLabel(existingLabelIndex)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Remove Label
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddElementLabel(index)}
                            className="text-xs text-blue-600 hover:text-blue-700"
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
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
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
          <div className="space-y-3">
            <button
              onClick={handleCreateTextBox}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              + Create Text Box
            </button>

            {labels.textBoxes.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No text boxes yet.</p>
            ) : (
              <div className="space-y-2">
                {labels.textBoxes.map((textBox) => (
                  <div
                    key={textBox.id}
                    className={`p-3 border rounded ${
                      editingTextBoxId === textBox.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setEditingTextBoxId(editingTextBoxId === textBox.id ? null : textBox.id)}
                        className="text-sm font-medium text-left flex-1"
                      >
                        {textBox.text.substring(0, 30)}{textBox.text.length > 30 ? '...' : ''}
                      </button>
                      <button
                        onClick={() => handleDeleteTextBox(textBox.id)}
                        className="text-red-600 hover:text-red-700 ml-2"
                        title="Delete text box"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {editingTextBoxId === textBox.id && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <textarea
                            value={textBox.text}
                            onChange={(e) => handleTextBoxChange(textBox.id, 'text', e.target.value)}
                            onBlur={handleTextBoxBlur}
                            rows={3}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded resize-none"
                          />
                          <button
                            onClick={onCharacterPaletteOpen}
                            className="px-2 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-lg self-start"
                            title="Open Character Palette"
                          >
                            Σ
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Font Size: {textBox.fontSize}px
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
                            <label className="block text-xs text-gray-600 mb-1">Text Color</label>
                            <input
                              type="color"
                              value={textBox.color}
                              onChange={(e) => handleTextBoxChange(textBox.id, 'color', e.target.value)}
                              onBlur={handleTextBoxBlur}
                              className="w-full h-8 rounded border border-gray-300"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Border Color</label>
                            <input
                              type="color"
                              value={textBox.borderColor}
                              onChange={(e) => handleTextBoxChange(textBox.id, 'borderColor', e.target.value)}
                              onBlur={handleTextBoxBlur}
                              className="w-full h-8 rounded border border-gray-300"
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
