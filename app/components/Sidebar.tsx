import React, { useState, useEffect } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
      className="hidden lg:flex flex-col shrink-0 bg-white border-r"
      style={{
        borderColor: 'var(--border)',
        width: collapsed ? 44 : 300,
        overflowX: 'hidden',
        overflowY: collapsed ? 'hidden' : 'auto',
      }}
    >
      <div
        className="flex shrink-0 items-center px-1"
        style={{ height: 40, justifyContent: collapsed ? 'center' : 'flex-end' }}
      >
        <button
          onClick={handleToggle}
          className="btn btn-ghost btn-icon"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {!collapsed && <div>{children}</div>}
    </aside>
  );
}
