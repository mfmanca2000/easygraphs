import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface CollapsiblePanelProps {
  id: string;
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsiblePanel({
  id,
  title,
  defaultExpanded = false,
  children,
  className = '',
}: CollapsiblePanelProps) {
  const [isExpanded, setIsExpanded] = useLocalStorage(
    `easygraphs-panel-${id}`,
    defaultExpanded
  );
  const [mounted, setMounted] = useState(false);

  // Only render with localStorage value after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use defaultExpanded during SSR and initial render, then switch to localStorage value
  const expanded = mounted ? isExpanded : defaultExpanded;

  return (
    <div className={className} style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
        style={{ height: 40, padding: '0 16px' }}
        aria-expanded={expanded}
      >
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{title}</h3>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms',
          }}
        />
      </button>

      <div hidden={!expanded} className="px-4 pb-4">
        {children}
      </div>
    </div>
  );
}
