'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

interface CharacterPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterSelect?: (char: string) => void;
}

type Category = 'greek' | 'math' | 'superscript' | 'subscript' | 'arrows';

const CHARACTER_CATEGORIES = {
  greek: {
    name: 'Greek Letters',
    characters: [
      'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ',
      'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
      'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ',
      'Ν', 'Ξ', 'Ο', 'Π', 'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω'
    ]
  },
  math: {
    name: 'Math Symbols',
    characters: [
      '±', '×', '÷', '≠', '≈', '≤', '≥', '∞', '∑', '∏', '∫', '∂',
      '√', '∈', '∀', '∃', '∅', '∩', '∪', '⊂', '⊃', '⊆', '⊇', '∝',
      '∴', '∵', '∧', '∨', '¬', '⊕', '⊗', '⊥', '∥', '∠', '°', '′',
      '″', '‰', '‱', '℘'
    ]
  },
  superscript: {
    name: 'Superscripts',
    characters: [
      '⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹',
      '⁺', '⁻', '⁼', '⁽', '⁾', 'ⁿ', 'ⁱ',
      'ᵃ', 'ᵇ', 'ᶜ', 'ᵈ', 'ᵉ', 'ᶠ', 'ᵍ', 'ʰ', 'ⁱ', 'ʲ', 'ᵏ', 'ˡ', 'ᵐ', 'ⁿ', 'ᵒ', 'ᵖ'
    ]
  },
  subscript: {
    name: 'Subscripts',
    characters: [
      '₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉',
      '₊', '₋', '₌', '₍', '₎',
      'ₐ', 'ₑ', 'ₒ', 'ₓ', 'ₔ', 'ₕ', 'ₖ', 'ₗ', 'ₘ', 'ₙ', 'ₚ', 'ₛ', 'ₜ'
    ]
  },
  arrows: {
    name: 'Arrows & Misc',
    characters: [
      '→', '←', '↑', '↓', '↔', '↕', '⇒', '⇐', '⇔', '⇑', '⇓',
      '↗', '↘', '↙', '↖', '⟶', '⟵', '⟷',
      '★', '☆', '●', '○', '■', '□', '▲', '△', '▼', '▽', '◆', '◇',
      '✓', '✗', '✕', '…'
    ]
  }
};

export default function CharacterPalette({ isOpen, onClose, onCharacterSelect }: CharacterPaletteProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('greek');
  const [copiedChar, setCopiedChar] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCharacterClick = async (char: string) => {
    try {
      await navigator.clipboard.writeText(char);
      setCopiedChar(char);
      setTimeout(() => setCopiedChar(null), 1000);

      if (onCharacterSelect) {
        onCharacterSelect(char);
      }
    } catch (err) {
      console.error('Failed to copy character:', err);
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
        className="modal max-w-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Character Palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Character Palette</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          <div className="seg" style={{ display: 'flex', flexWrap: 'wrap' }}>
            {(Object.keys(CHARACTER_CATEGORIES) as Category[]).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className="seg-item"
                style={{ flex: '1 1 auto' }}
                aria-pressed={activeCategory === category}
              >
                {CHARACTER_CATEGORIES[category].name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
            {CHARACTER_CATEGORIES[activeCategory].characters.map((char, index) => (
              <button
                key={index}
                onClick={() => handleCharacterClick(char)}
                className="flex items-center justify-center hover:bg-[var(--bg)]"
                style={{
                  width: 36,
                  height: 36,
                  fontSize: 18,
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  ...(copiedChar === char
                    ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)' }
                    : {}),
                }}
                title={`Copy "${char}"`}
              >
                {char}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          <span>Click any character to copy it to the clipboard</span>
          {copiedChar && (
            <span className="inline-flex items-center gap-1" style={{ color: 'var(--success)', fontWeight: 500 }}>
              <Check size={14} />
              Copied &ldquo;{copiedChar}&rdquo;
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
