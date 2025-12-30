'use client';

interface QuickGuidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickGuidePanel({ isOpen, onClose }: QuickGuidePanelProps) {
  if (!isOpen) return null;

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
      <div
        className="rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-auto"
        style={{
          background: 'var(--background)',
          border: '2px solid var(--architect-blue)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-5 border-b z-10" style={{
          borderColor: 'var(--graph-lines)',
          background: 'var(--background)'
        }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
              background: 'var(--architect-blue)',
              color: 'white'
            }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', fontWeight: 600 }}>?</span>
            </div>
            <h2 className="text-xl font-semibold" style={{
              color: 'var(--architect-blue)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              Quick Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-3xl leading-none transition-colors"
            style={{
              color: 'var(--pencil-lead)',
              opacity: 0.6
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-4" style={{
                color: 'var(--architect-blue)',
                fontFamily: 'DM Sans, sans-serif'
              }}>
                Drawing Tools
              </h3>
              <ul className="space-y-3 text-sm" style={{ color: 'var(--pencil-lead)' }}>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 font-semibold" style={{
                    color: 'var(--architect-orange)',
                    minWidth: '20px'
                  }}>→</span>
                  <span><strong>Select:</strong> Click to select, drag points to edit</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 font-semibold" style={{
                    color: 'var(--architect-orange)',
                    minWidth: '20px'
                  }}>→</span>
                  <span><strong>Move:</strong> Select object, then drag to translate (CTRL no longer required)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 font-semibold" style={{
                    color: 'var(--architect-blue)',
                    minWidth: '20px'
                  }}>→</span>
                  <span><strong>Line:</strong> Click two points or enter coordinates</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 font-semibold" style={{
                    color: 'var(--architect-orange)',
                    minWidth: '20px'
                  }}>→</span>
                  <span><strong>Curves:</strong> Select type, click endpoints, drag control point</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 font-semibold" style={{
                    color: 'var(--architect-green)',
                    minWidth: '20px'
                  }}>→</span>
                  <span><strong>Freehand:</strong> Click and drag to draw smoothly</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 font-semibold" style={{
                    color: 'var(--architect-blue)',
                    minWidth: '20px'
                  }}>→</span>
                  <span><strong>Function:</strong> Enter f(x) formula to plot graphs</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4" style={{
                color: 'var(--architect-blue)',
                fontFamily: 'DM Sans, sans-serif'
              }}>
                Navigation
              </h3>
              <ul className="space-y-3 text-sm" style={{ color: 'var(--pencil-lead)' }}>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 font-semibold" style={{
                    color: 'var(--architect-orange)',
                    minWidth: '20px'
                  }}>→</span>
                  <span><strong>Pan:</strong> Click near the axis and drag or hold CTRL + drag to move the canvas</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 font-semibold" style={{
                    color: 'var(--architect-green)',
                    minWidth: '20px'
                  }}>→</span>
                  <span><strong>Zoom:</strong> Scroll mouse wheel to zoom in/out</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4" style={{
                color: 'var(--architect-blue)',
                fontFamily: 'DM Sans, sans-serif'
              }}>
                Keyboard Shortcuts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm" style={{ color: 'var(--pencil-lead)' }}>
                <div className="flex justify-between items-center p-2 rounded" style={{
                  background: 'rgba(43, 95, 130, 0.05)',
                  border: '1px solid var(--graph-lines)'
                }}>
                  <span className="font-semibold">Undo</span>
                  <kbd className="px-2 py-1 rounded text-xs" style={{
                    background: 'var(--architect-blue)',
                    color: 'white',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>Ctrl+Z</kbd>
                </div>
                <div className="flex justify-between items-center p-2 rounded" style={{
                  background: 'rgba(43, 95, 130, 0.05)',
                  border: '1px solid var(--graph-lines)'
                }}>
                  <span className="font-semibold">Redo</span>
                  <kbd className="px-2 py-1 rounded text-xs" style={{
                    background: 'var(--architect-blue)',
                    color: 'white',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>Ctrl+Y</kbd>
                </div>
                <div className="flex justify-between items-center p-2 rounded" style={{
                  background: 'rgba(43, 95, 130, 0.05)',
                  border: '1px solid var(--graph-lines)'
                }}>
                  <span className="font-semibold">Copy</span>
                  <kbd className="px-2 py-1 rounded text-xs" style={{
                    background: 'var(--architect-blue)',
                    color: 'white',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>Ctrl+C</kbd>
                </div>
                <div className="flex justify-between items-center p-2 rounded" style={{
                  background: 'rgba(43, 95, 130, 0.05)',
                  border: '1px solid var(--graph-lines)'
                }}>
                  <span className="font-semibold">Paste</span>
                  <kbd className="px-2 py-1 rounded text-xs" style={{
                    background: 'var(--architect-blue)',
                    color: 'white',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>Ctrl+V</kbd>
                </div>
                <div className="flex justify-between items-center p-2 rounded" style={{
                  background: 'rgba(43, 95, 130, 0.05)',
                  border: '1px solid var(--graph-lines)'
                }}>
                  <span className="font-semibold">Delete</span>
                  <kbd className="px-2 py-1 rounded text-xs" style={{
                    background: 'var(--architect-blue)',
                    color: 'white',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>Del</kbd>
                </div>
                <div className="flex justify-between items-center p-2 rounded" style={{
                  background: 'rgba(43, 95, 130, 0.05)',
                  border: '1px solid var(--graph-lines)'
                }}>
                  <span className="font-semibold">Escape</span>
                  <kbd className="px-2 py-1 rounded text-xs" style={{
                    background: 'var(--architect-blue)',
                    color: 'white',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>Esc</kbd>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-4 border-t rounded-b-lg" style={{
          background: 'var(--background)',
          borderColor: 'var(--graph-lines)'
        }}>
          <p className="text-sm text-center" style={{ color: 'var(--pencil-lead)', opacity: 0.8 }}>
            Press <kbd className="px-2 py-0.5 rounded text-xs" style={{
              background: 'var(--graph-lines)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}
