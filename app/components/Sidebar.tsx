import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface SidebarProps {
  children: React.ReactNode;
  onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({ children, onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useLocalStorage('easygraphs-sidebar-collapsed', false);
  const [mounted, setMounted] = useState(false);

  // Only render with localStorage value after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use false during SSR and initial render, then switch to localStorage value
  const collapsed = mounted ? isCollapsed : false;

  useEffect(() => {
    onCollapseChange?.(collapsed);
  }, [collapsed, onCollapseChange]);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside
      className={`sidebar-container hidden lg:flex flex-col space-y-4 transition-all duration-300 ${
        collapsed ? 'w-12' : 'w-80'
      } shrink-0 relative`}
      style={{ overflowX: 'hidden', overflowY: collapsed ? 'hidden' : 'auto' }}
    >
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className="absolute top-2 right-2 z-10 p-2 rounded-full shadow-lg transition-all hover:scale-110"
        style={{
          background: 'var(--architect-blue)',
          color: 'white',
        }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Sidebar Content */}
      {!collapsed && <div className="space-y-4 animate-slideInLeft">{children}</div>}
    </aside>
  );
}
