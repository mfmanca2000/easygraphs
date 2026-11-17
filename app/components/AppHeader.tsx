'use client';

import { useEffect, useState } from 'react';
import {
  Copy,
  Clipboard,
  Trash2,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Eraser,
  Maximize,
  ZoomIn,
  ZoomOut,
  Group,
  Ungroup,
  Download,
  Menu,
  HelpCircle,
} from 'lucide-react';

export interface ActionsPanelProps {
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onExportJPEG: (quality: number) => void;
  onExportPDF: (pageSize: string, orientation: 'portrait' | 'landscape') => void;
  onExportJSON: () => void;
  onImportJSON: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  hasSelection: boolean;
  onGroup: () => void;
  onUngroup: () => void;
  canGroup: boolean;
  canUngroup: boolean;
  onClear: () => void;
  onResetToDefault: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

interface AppHeaderProps extends ActionsPanelProps {
  onOpenGuide: () => void;
  onOpenMenu: () => void;
}

export default function AppHeader({
  onUndo,
  onRedo,
  onExport,
  onExportJPEG,
  onExportPDF,
  onExportJSON,
  onImportJSON,
  onCopy,
  onPaste,
  onDelete,
  hasSelection,
  onGroup,
  onUngroup,
  canGroup,
  canUngroup,
  onClear,
  onResetToDefault,
  onZoomIn,
  onZoomOut,
  onOpenGuide,
  onOpenMenu,
}: AppHeaderProps) {
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'pdf'>('png');
  const [jpegQuality, setJpegQuality] = useState(90);
  const [pdfPageSize, setPdfPageSize] = useState<'letter' | 'a4' | 'a3'>('letter');
  const [pdfOrientation, setPdfOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!exportOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exportOpen]);

  const iconBtn = 'btn btn-ghost btn-icon';

  return (
    <header
      className="relative z-30 flex shrink-0 flex-wrap items-center gap-x-2 bg-white px-3 py-1.5 lg:flex-nowrap lg:py-0"
      style={{ minHeight: 52, borderBottom: '1px solid var(--border)' }}
    >
      <button
        onClick={onOpenMenu}
        className={`${iconBtn} lg:hidden`}
        aria-label="Open menu"
        title="Open menu"
      >
        <Menu size={18} />
      </button>

      <h1 className="flex shrink-0 items-center gap-2" style={{ fontSize: 15, fontWeight: 600 }}>
        <span
          className="flex items-center justify-center"
          style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--accent)' }}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 2v12M2 8h12" />
            <path d="M4 12c2-1 3-5 8-6" strokeWidth="1.2" />
          </svg>
        </span>
        <span className="hidden sm:inline">EasyGraphs</span>
      </h1>

      <div className="divider hidden lg:block" />

      {/* Below lg this becomes a second full-width row so every action stays visible */}
      <div
        className="order-last -mx-3 mt-1.5 flex basis-full flex-wrap items-center gap-0.5 sm:gap-1 border-t px-3 pt-1.5 lg:order-none lg:mx-0 lg:mt-0 lg:basis-auto lg:min-w-0 lg:flex-nowrap lg:overflow-x-auto lg:border-t-0 lg:px-0 lg:pt-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <button onClick={onUndo} className={iconBtn} title="Undo (Ctrl+Z)" aria-label="Undo">
          <Undo2 size={16} />
        </button>
        <button onClick={onRedo} className={iconBtn} title="Redo (Ctrl+Y)" aria-label="Redo">
          <Redo2 size={16} />
        </button>

        <div className="divider mx-1 hidden sm:block" />

        <button onClick={onZoomOut} className={iconBtn} title="Zoom Out" aria-label="Zoom out">
          <ZoomOut size={16} />
        </button>
        <button onClick={onZoomIn} className={iconBtn} title="Zoom In" aria-label="Zoom in">
          <ZoomIn size={16} />
        </button>
        <button onClick={onResetToDefault} className={iconBtn} title="Reset view" aria-label="Reset view">
          <Maximize size={16} />
        </button>

        <div className="divider mx-1 hidden sm:block" />

        <button onClick={onCopy} disabled={!hasSelection} className={iconBtn} title="Copy (Ctrl+C)" aria-label="Copy">
          <Copy size={16} />
        </button>
        <button onClick={onPaste} className={iconBtn} title="Paste (Ctrl+V)" aria-label="Paste">
          <Clipboard size={16} />
        </button>
        <button
          onClick={onDelete}
          disabled={!hasSelection}
          className={`${iconBtn} btn-danger`}
          title="Delete (Del/Backspace)"
          aria-label="Delete"
        >
          <Trash2 size={16} />
        </button>

        <div className="divider mx-1 hidden sm:block" />

        <button onClick={onGroup} disabled={!canGroup} className="btn btn-ghost max-sm:w-8 max-sm:px-0" title="Group selected elements" aria-label="Group">
          <Group size={16} />
          <span className="hidden sm:inline">Group</span>
        </button>
        <button onClick={onUngroup} disabled={!canUngroup} className="btn btn-ghost max-sm:w-8 max-sm:px-0" title="Ungroup selected elements" aria-label="Ungroup">
          <Ungroup size={16} />
          <span className="hidden sm:inline">Ungroup</span>
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <button onClick={onImportJSON} className="btn btn-ghost" title="Open project (JSON)" aria-label="Open project">
        <FolderOpen size={16} />
        <span className="hidden xl:inline">Open</span>
      </button>
      <button onClick={onExportJSON} className="btn btn-ghost" title="Save project (JSON)" aria-label="Save project">
        <Save size={16} />
        <span className="hidden xl:inline">Save</span>
      </button>

      <div className="relative">
        <button
          onClick={() => setExportOpen((o) => !o)}
          className="btn btn-primary"
          aria-expanded={exportOpen}
          aria-haspopup="true"
        >
          <Download size={16} />
          Export
        </button>

        {exportOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
            <div
              className="menu absolute z-50 space-y-3"
              style={{ right: 0, top: '100%', marginTop: 6, padding: 12, width: 240 }}
            >
              <div className="seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {(['png', 'jpeg', 'pdf'] as const).map((f) => (
                  <button
                    key={f}
                    className="seg-item"
                    aria-pressed={exportFormat === f}
                    onClick={() => setExportFormat(f)}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>

              {exportFormat === 'jpeg' && (
                <div>
                  <label className="field-label" htmlFor="jpeg-quality">Quality %</label>
                  <input
                    id="jpeg-quality"
                    type="number"
                    min="1"
                    max="100"
                    value={jpegQuality}
                    onChange={(e) => setJpegQuality(Number(e.target.value))}
                    className="input input-mono"
                  />
                </div>
              )}

              {exportFormat === 'pdf' && (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={pdfPageSize}
                    onChange={(e) => setPdfPageSize(e.target.value as 'letter' | 'a4' | 'a3')}
                    className="input"
                    aria-label="Page size"
                  >
                    <option value="letter">Letter</option>
                    <option value="a4">A4</option>
                    <option value="a3">A3</option>
                  </select>
                  <select
                    value={pdfOrientation}
                    onChange={(e) => setPdfOrientation(e.target.value as 'landscape' | 'portrait')}
                    className="input"
                    aria-label="Orientation"
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>
              )}

              <button
                className="btn btn-primary btn-block"
                onClick={() => {
                  if (exportFormat === 'png') onExport();
                  else if (exportFormat === 'jpeg') onExportJPEG(jpegQuality / 100);
                  else if (exportFormat === 'pdf') onExportPDF(pdfPageSize, pdfOrientation);
                  setExportOpen(false);
                }}
              >
                Download
              </button>
            </div>
          </>
        )}
      </div>

      <button onClick={onClear} className={`${iconBtn} btn-danger`} title="Clear all" aria-label="Clear all">
        <Eraser size={16} />
      </button>
      <button onClick={onOpenGuide} className={iconBtn} title="Quick Guide" aria-label="Open Quick Guide">
        <HelpCircle size={18} />
      </button>
    </header>
  );
}
