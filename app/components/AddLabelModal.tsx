'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface AddLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLabel: (text: string) => void;
  elementId: number;
  intersectionIndex?: number | null;
}

export default function AddLabelModal({ isOpen, onClose, onAddLabel, elementId, intersectionIndex }: AddLabelModalProps) {
  const [labelText, setLabelText] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine the type of label
  const isIntersectionLabel = intersectionIndex !== null && intersectionIndex !== undefined;
  const isAxisLabel = elementId === -1 || elementId === -2;
  const isXAxis = elementId === -1;

  const modalTitle = isIntersectionLabel
    ? `Add Label to Intersection #${intersectionIndex}`
    : isAxisLabel
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
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="modal max-w-md"
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{modalTitle}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label htmlFor="labelText" className="field-label">Label text</label>
            <input
              type="text"
              id="labelText"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              className="input"
              placeholder="Enter label text..."
              autoFocus
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!labelText.trim()}>
              Add label
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
