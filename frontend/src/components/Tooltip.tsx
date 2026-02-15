// frontend/src/components/Tooltip.tsx
// Minimalist tooltip — portal-based to escape overflow:hidden containers
// Renders into document.body so tooltips always appear above all components
// Related: global.css, IconSidebar.tsx

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface TooltipProps {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
  className?: string;
  /** Disable tooltip (e.g. when parent label is visible) */
  disabled?: boolean;
}

const GAP = 8; // px gap between trigger and tooltip

export default function Tooltip({ content, side = 'top', children, className, disabled }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), 100);
  }, []);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), 50);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // Calculate position when tooltip becomes visible
  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();

    let x = 0;
    let y = 0;

    switch (side) {
      case 'top':
        x = trigger.left + trigger.width / 2 - tooltip.width / 2;
        y = trigger.top - tooltip.height - GAP;
        break;
      case 'bottom':
        x = trigger.left + trigger.width / 2 - tooltip.width / 2;
        y = trigger.bottom + GAP;
        break;
      case 'left':
        x = trigger.left - tooltip.width - GAP;
        y = trigger.top + trigger.height / 2 - tooltip.height / 2;
        break;
      case 'right':
        x = trigger.right + GAP;
        y = trigger.top + trigger.height / 2 - tooltip.height / 2;
        break;
    }

    // Clamp to viewport
    x = Math.max(4, Math.min(x, window.innerWidth - tooltip.width - 4));
    y = Math.max(4, Math.min(y, window.innerHeight - tooltip.height - 4));

    setPos({ x, y });
  }, [visible, side]);

  if (disabled) return <>{children}</>;

  return (
    <>
      <div
        ref={triggerRef}
        className={clsx('inline-flex', className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>

      {visible && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            zIndex: 99999,
          }}
          className={clsx(
            'pointer-events-none',
            'px-2.5 py-1.5 rounded-lg',
            'bg-surface-800 backdrop-blur-lg border border-surface-600/50',
            'text-[11px] font-semibold text-surface-100 whitespace-nowrap',
            'shadow-xl shadow-black/40',
            'animate-tooltip-in',
          )}
        >
          {content}
          {/* Arrow */}
          <div
            className={clsx(
              'absolute w-2 h-2 bg-surface-800 border-surface-600/50 rotate-45',
              side === 'top' && 'top-full left-1/2 -translate-x-1/2 -mt-1 border-r border-b',
              side === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l border-t',
              side === 'left' && 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t border-r',
              side === 'right' && 'right-full top-1/2 -translate-y-1/2 -mr-1 border-b border-l',
            )}
          />
        </div>,
        document.body,
      )}
    </>
  );
}
