'use client';

import { useState } from 'react';
import { Copy, Clipboard, Trash2, Undo2, Redo2, Save, Upload, Eraser, Focus } from 'lucide-react';

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
}

export default function ActionsPanel({
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
}: ActionsPanelProps) {
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'pdf'>('png');
  const [jpegQuality, setJpegQuality] = useState(90);
  const [pdfPageSize, setPdfPageSize] = useState<'letter' | 'a4' | 'a3'>('letter');
  const [pdfOrientation, setPdfOrientation] = useState<'landscape' | 'portrait'>('landscape');

  return (
    <div className="control-panel rounded-lg p-4">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Undo/Redo */}
        <div className="flex gap-2">
          <button
            onClick={onUndo}
            className="px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: 'transparent',
              color: 'var(--architect-blue)',
              border: '1.5px solid var(--canvas-border)'
            }}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={onRedo}
            className="px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: 'transparent',
              color: 'var(--architect-blue)',
              border: '1.5px solid var(--canvas-border)'
            }}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '32px', background: 'var(--canvas-border)' }} />

        {/* Reset to Default */}
        <button
          onClick={onResetToDefault}
          className="px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
          style={{
            background: 'transparent',
            color: 'var(--architect-blue)',
            border: '1.5px solid var(--canvas-border)'
          }}
          title="Reset to Default"
        >
          <Focus size={16} />
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '32px', background: 'var(--canvas-border)' }} />

        {/* Selection Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            disabled={!hasSelection}
            className="px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: hasSelection ? 'transparent' : 'var(--graph-lines)',
              color: hasSelection ? 'var(--architect-blue)' : 'var(--pencil-lead)',
              opacity: hasSelection ? 1 : 0.5,
              cursor: hasSelection ? 'pointer' : 'not-allowed',
              border: '1.5px solid var(--canvas-border)'
            }}
            title="Copy (Ctrl+C)"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={onPaste}
            className="px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: 'transparent',
              color: 'var(--architect-blue)',
              border: '1.5px solid var(--canvas-border)'
            }}
            title="Paste (Ctrl+V)"
          >
            <Clipboard size={16} />
          </button>
          <button
            onClick={onDelete}
            disabled={!hasSelection}
            className="px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: hasSelection ? 'transparent' : 'var(--graph-lines)',
              color: hasSelection ? 'var(--architect-red)' : 'var(--pencil-lead)',
              opacity: hasSelection ? 1 : 0.5,
              cursor: hasSelection ? 'pointer' : 'not-allowed',
              border: '1.5px solid var(--canvas-border)'
            }}
            title="Delete (Del/Backspace)"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '32px', background: 'var(--canvas-border)' }} />

        {/* Group/Ungroup */}
        <div className="flex gap-2">
          <button
            onClick={onGroup}
            disabled={!canGroup}
            className="px-3 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: canGroup ? 'var(--architect-blue)' : 'var(--graph-lines)',
              color: canGroup ? 'white' : 'var(--pencil-lead)',
              opacity: canGroup ? 1 : 0.5,
              cursor: canGroup ? 'pointer' : 'not-allowed',
              border: '1.5px solid var(--canvas-border)'
            }}
            title="Group selected elements"
          >
            Group
          </button>
          <button
            onClick={onUngroup}
            disabled={!canUngroup}
            className="px-3 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: canUngroup ? 'var(--architect-blue)' : 'var(--graph-lines)',
              color: canUngroup ? 'white' : 'var(--pencil-lead)',
              opacity: canUngroup ? 1 : 0.5,
              cursor: canUngroup ? 'pointer' : 'not-allowed',
              border: '1.5px solid var(--canvas-border)'
            }}
            title="Ungroup selected elements"
          >
            Ungroup
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '32px', background: 'var(--canvas-border)' }} />

        {/* Export Format Selection */}
        <div className="flex gap-2 items-center">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'png' | 'jpeg' | 'pdf')}
            className="px-3 py-2 rounded-md text-sm"
            style={{
              border: '1.5px solid var(--canvas-border)',
              color: 'var(--pencil-lead)',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="pdf">PDF</option>
          </select>

          {/* JPEG Quality */}
          {exportFormat === 'jpeg' && (
            <input
              type="number"
              min="1"
              max="100"
              value={jpegQuality}
              onChange={(e) => setJpegQuality(Number(e.target.value))}
              className="w-16 px-2 py-2 text-sm rounded-md"
              style={{
                border: '1.5px solid var(--canvas-border)',
                fontFamily: 'JetBrains Mono, monospace'
              }}
              title="Quality %"
            />
          )}

          {/* PDF Options */}
          {exportFormat === 'pdf' && (
            <>
              <select
                value={pdfPageSize}
                onChange={(e) => setPdfPageSize(e.target.value as 'letter' | 'a4' | 'a3')}
                className="px-2 py-2 rounded-md text-sm"
                style={{
                  border: '1.5px solid var(--canvas-border)',
                  fontFamily: 'JetBrains Mono, monospace'
                }}
              >
                <option value="letter">Letter</option>
                <option value="a4">A4</option>
                <option value="a3">A3</option>
              </select>
              <select
                value={pdfOrientation}
                onChange={(e) => setPdfOrientation(e.target.value as 'landscape' | 'portrait')}
                className="px-2 py-2 rounded-md text-sm"
                style={{
                  border: '1.5px solid var(--canvas-border)',
                  fontFamily: 'JetBrains Mono, monospace'
                }}
              >
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </>
          )}

          <button
            onClick={() => {
              if (exportFormat === 'png') onExport();
              else if (exportFormat === 'jpeg') onExportJPEG(jpegQuality / 100);
              else if (exportFormat === 'pdf') onExportPDF(pdfPageSize, pdfOrientation);
            }}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: 'var(--architect-blue)',
              color: 'white',
              border: 'none'
            }}
          >
            ↓ Export
          </button>

          {/* Divider */}
          <div style={{ width: '1px', height: '32px', background: 'var(--canvas-border)' }} />

          <button
            onClick={onExportJSON}
            className="px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: 'transparent',
              color: 'var(--architect-blue)',
              border: '1.5px solid var(--canvas-border)'
            }}
            title="Export as JSON"
          >
            <Save size={16} />
          </button>

          <button
            onClick={onImportJSON}
            className="px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: 'transparent',
              color: 'var(--architect-blue)',
              border: '1.5px solid var(--canvas-border)'
            }}
            title="Import JSON"
          >
            <Upload size={16} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '32px', background: 'var(--canvas-border)' }} />

        {/* Clear All */}
        <button
          onClick={onClear}
          className="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
          style={{
            background: 'rgba(231, 76, 60, 0.1)',
            color: 'var(--architect-red)',
            border: '1.5px solid var(--architect-red)'
          }}
          title="Clear All"
        >
          <Eraser size={16} />
        </button>
      </div>
    </div>
  );
}
