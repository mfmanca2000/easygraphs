'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface QuickGuidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Drawing Tools',
    items: [
      ['Select', 'Click to select, drag points to edit'],
      ['Move', 'Select an object, then drag it.'],
      ['Line', 'Click two points or enter coordinates'],
      ['Curves', 'Select type, click endpoints, drag control point'],
      ['Freehand', 'Click and drag to draw smoothly'],
      ['Function', 'Enter f(x) formula to plot graphs'],
    ],
  },
  {
    title: 'Navigation',
    items: [
      ['Pan', 'Click near the axis and drag or hold CTRL + drag to move the canvas'],
      ['Zoom', 'Scroll mouse wheel to zoom in/out'],
    ],
  },
];

const SHORTCUTS: [string, string][] = [
  ['Undo', 'Ctrl+Z'],
  ['Redo', 'Ctrl+Y'],
  ['Copy', 'Ctrl+C'],
  ['Paste', 'Ctrl+V'],
  ['Delete', 'Del'],
  ['Escape', 'Esc'],
];

export default function QuickGuidePanel({ isOpen, onClose }: QuickGuidePanelProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const sectionTitle = { fontSize: 13, fontWeight: 600, marginBottom: 8 } as const;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="modal max-w-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Quick Guide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header sticky top-0 z-10 bg-white">
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Quick Guide</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-6">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 style={sectionTitle}>{section.title}</h3>
              <ul className="space-y-2" style={{ fontSize: 13 }}>
                {section.items.map(([term, desc]) => (
                  <li key={term} className="flex gap-3">
                    <strong className="shrink-0" style={{ width: 88 }}>{term}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>{desc}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section>
            <h3 style={sectionTitle}>Keyboard Shortcuts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2" style={{ fontSize: 13 }}>
              {SHORTCUTS.map(([name, key]) => (
                <div key={name} className="flex items-center justify-between">
                  <span>{name}</span>
                  <kbd className="kbd">{key}</kbd>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="modal-footer sticky bottom-0" style={{ justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>
            Press <kbd className="kbd">Esc</kbd> or click outside to close
          </span>
        </div>
      </div>
    </div>
  );
}
