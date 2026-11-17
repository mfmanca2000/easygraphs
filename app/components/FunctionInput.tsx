'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

export interface FunctionInputProps {
  onAddFunction: (formula: string, xMin: number, xMax: number, color: string, lineWidth: number) => void;
  strokeColor: string;
  strokeWidth: number;
}

const HELP: [string, string][] = [
  ['Basic', '+, -, *, /, ^'],
  ['Trig', 'sin(x), cos(x), tan(x)'],
  ['Other', 'sqrt(x), abs(x), ln(x), exp(x)'],
  ['Constants', 'pi, e'],
];

export default function FunctionInput({ onAddFunction, strokeColor, strokeWidth }: FunctionInputProps) {
  const [formula, setFormula] = useState('');
  const [xMin, setXMin] = useState('-10');
  const [xMax, setXMax] = useState('10');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const minVal = parseFloat(xMin);
    const maxVal = parseFloat(xMax);

    if (!formula.trim()) {
      setError('Please enter a formula');
      return;
    }

    if (isNaN(minVal) || isNaN(maxVal)) {
      setError('Please enter valid x-range values');
      return;
    }

    if (minVal >= maxVal) {
      setError('x-min must be less than x-max');
      return;
    }

    try {
      onAddFunction(formula, minVal, maxVal, strokeColor, strokeWidth);
      setFormula('');
      setXMin('-10');
      setXMax('10');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid formula');
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label" htmlFor="fn-formula">Formula f(x)</label>
          <input
            id="fn-formula"
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="e.g., x^2, sin(x), 2*x + 3"
            className="input input-mono"
          />
        </div>

        <div>
          <div className="field-label">X range</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.1"
              value={xMin}
              onChange={(e) => setXMin(e.target.value)}
              placeholder="min"
              aria-label="x min"
              className="input input-mono"
            />
            <input
              type="number"
              step="0.1"
              value={xMax}
              onChange={(e) => setXMax(e.target.value)}
              placeholder="max"
              aria-label="x max"
              className="input input-mono"
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              fontSize: 12,
              color: 'var(--danger)',
              background: 'var(--danger-soft)',
              border: '1px solid var(--danger)',
              borderRadius: 6,
              padding: '6px 10px',
            }}
          >
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-block">
          <Plus size={16} />
          Plot function
        </button>
      </form>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>Supported</div>
        <dl className="grid gap-y-1 gap-x-3" style={{ gridTemplateColumns: 'auto 1fr', fontSize: 12 }}>
          {HELP.map(([cat, items]) => (
            <div key={cat} style={{ display: 'contents' }}>
              <dt style={{ color: 'var(--text-muted)' }}>{cat}</dt>
              <dd style={{ fontFamily: 'var(--font-mono)' }}>{items}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
