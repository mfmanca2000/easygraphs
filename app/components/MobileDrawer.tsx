import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileDrawer({ isOpen, onClose, children }: MobileDrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="mobile-drawer-backdrop absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`mobile-drawer ${isOpen ? 'open' : ''} fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl overflow-y-auto`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-0 right-0 ml-auto m-4 p-2 rounded-full shadow-lg transition-all hover:scale-110 z-10"
          style={{
            background: 'var(--architect-blue)',
            color: 'white',
          }}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* Drawer Content */}
        <div className="px-4 pb-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}
