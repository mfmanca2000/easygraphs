'use client';

import { useState } from 'react';

export interface FunctionInputProps {
  onAddFunction: (formula: string, xMin: number, xMax: number, color: string, lineWidth: number) => void;
  strokeColor: string;
  strokeWidth: number;
}

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
        {/* Formula Input */}
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
            Formula f(x)
          </label>
          <input
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="e.g., x^2, sin(x), 2*x + 3"
            className="w-full px-3 py-2 text-sm rounded-md"
            style={{
              border: '1.5px solid var(--canvas-border)',
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--pencil-lead)'
            }}
          />
        </div>

        {/* X Range */}
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: 'var(--pencil-lead)' }}>
            X Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.1"
              value={xMin}
              onChange={(e) => setXMin(e.target.value)}
              placeholder="x-min"
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{
                border: '1.5px solid var(--canvas-border)',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--pencil-lead)'
              }}
            />
            <input
              type="number"
              step="0.1"
              value={xMax}
              onChange={(e) => setXMax(e.target.value)}
              placeholder="x-max"
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{
                border: '1.5px solid var(--canvas-border)',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--pencil-lead)'
              }}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-3 py-2 rounded-md text-xs" style={{
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid #E74C3C',
            color: '#E74C3C',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all"
          style={{
            background: 'var(--architect-blue)',
            color: 'white',
            border: 'none'
          }}
        >
          + Plot Function
        </button>
      </form>

      {/* Function Help */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--graph-lines)' }}>
        <p className="text-xs font-medium mb-2" style={{
          color: 'var(--pencil-lead)',
          opacity: 0.7,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Supported Functions
        </p>
        <div className="space-y-1 text-xs" style={{
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--pencil-lead)',
          opacity: 0.7
        }}>
          <div>• Basic: +, -, *, /, ^</div>
          <div>• Trig: sin(x), cos(x), tan(x)</div>
          <div>• Other: sqrt(x), abs(x), ln(x), exp(x)</div>
          <div>• Constants: pi, e</div>
        </div>
      </div>
    </div>
  );
}
