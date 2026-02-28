// frontend/src/components/CustomSelect.tsx
// Fully styled custom select dropdown matching the dark theme
// Opens on hover with small delay, closes on mouse leave
// Related: global.css (.input-field), SettingsView.tsx, HistoryView.tsx

import { useState, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
}

export default function CustomSelect({ value, onChange, options, className = '' }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const selected = options.find((o) => o.value === value);

  const startOpen = useCallback(() => {
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setOpen(true), 80);
  }, []);

  const startClose = useCallback(() => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((o) => !o);
    }
  };

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      onMouseEnter={startOpen}
      onMouseLeave={startClose}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className="input-field w-full flex items-center justify-between gap-2 cursor-pointer text-left"
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-surface-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-lg border border-surface-700/50 bg-surface-900 shadow-xl shadow-black/40 overflow-hidden animate-fade-in"
          style={{ animationDuration: '150ms' }}
        >
          <div className="max-h-[260px] overflow-y-auto scrollbar-thin py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors duration-100
                  ${opt.value === value
                    ? 'bg-brand-500/10 text-brand-400 font-medium'
                    : 'text-surface-200 hover:bg-surface-800 hover:text-surface-50'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
