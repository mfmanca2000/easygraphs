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
        className="absolute inset-0"
        style={{ background: 'rgba(15, 23, 42, 0.4)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`mobile-drawer ${isOpen ? 'open' : ''} fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white overflow-y-auto`}
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between bg-white px-4"
          style={{ height: 48, borderBottom: '1px solid var(--border)' }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>Tools</span>
          <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
