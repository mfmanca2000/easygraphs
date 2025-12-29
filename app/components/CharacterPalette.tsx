'use client';

import { useState } from 'react';

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
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Character Palette</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {(Object.keys(CHARACTER_CATEGORIES) as Category[]).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                activeCategory === category
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {CHARACTER_CATEGORIES[category].name}
            </button>
          ))}
        </div>

        {/* Character Grid */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
            {CHARACTER_CATEGORIES[activeCategory].characters.map((char, index) => (
              <button
                key={index}
                onClick={() => handleCharacterClick(char)}
                className={`
                  aspect-square flex items-center justify-center
                  text-xl font-medium rounded border
                  transition-all duration-150
                  ${
                    copiedChar === char
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400 text-gray-800'
                  }
                `}
                title={`Copy "${char}"`}
              >
                {char}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-sm text-gray-600 text-center">
            Click any character to copy to clipboard
            {copiedChar && (
              <span className="ml-2 text-green-600 font-medium">
                ✓ Copied "{copiedChar}"
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
