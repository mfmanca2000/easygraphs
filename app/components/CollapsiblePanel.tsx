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
    <div className={`control-panel rounded-lg ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-black/5 transition-colors rounded-t-lg"
        aria-expanded={expanded}
      >
        <h3
          className="text-sm font-semibold"
          style={{
            color: 'var(--architect-blue)',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </h3>
        <ChevronDown
          className={`chevron-icon ${expanded ? 'rotated' : ''}`}
          size={18}
          style={{ color: 'var(--architect-blue)' }}
        />
      </button>

      <div className={`collapsible-content ${expanded ? 'expanded' : ''}`}>
        <div className="p-4 pt-0">{children}</div>
      </div>
    </div>
  );
}
