'use client';

import { useState } from 'react';

interface AddLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLabel: (text: string) => void;
  elementId: number;
}

export default function AddLabelModal({ isOpen, onClose, onAddLabel, elementId }: AddLabelModalProps) {
  const [labelText, setLabelText] = useState('');

  if (!isOpen) return null;

  // Determine if this is an axis label
  const isAxisLabel = elementId === -1 || elementId === -2;
  const isXAxis = elementId === -1;
  const modalTitle = isAxisLabel
    ? (isXAxis ? 'Add Label to X-Axis' : 'Add Label to Y-Axis')
    : 'Add Label to Element';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (labelText.trim()) {
      onAddLabel(labelText.trim());
      setLabelText('');
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--canvas-border)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--architect-blue)' }}>
            {modalTitle}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label
              htmlFor="labelText"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--architect-blue)' }}
            >
              Label Text
            </label>
            <input
              type="text"
              id="labelText"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              className="w-full px-3 py-2 rounded border focus:outline-none focus:ring-2"
              style={{
                borderColor: 'var(--canvas-border)',
                color: 'var(--architect-blue)'
              }}
              placeholder="Enter label text..."
              autoFocus
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border transition-colors"
              style={{
                borderColor: 'var(--canvas-border)',
                color: 'var(--architect-blue)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded transition-colors text-white"
              style={{
                background: '#E74C3C'
              }}
              disabled={!labelText.trim()}
            >
              Add Label
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
