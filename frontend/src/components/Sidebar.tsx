// frontend/src/components/Sidebar.tsx
// Left navigation sidebar — brand, nav links, collapse toggle
// Professional design with refined glassmorphism and smooth transitions
// Related: App.tsx, store.ts

import { clsx } from 'clsx';
import {
  Upload,
  History,
  Settings,
  PanelLeftClose,
  PanelLeft,
  FileSearch,
  Sparkles,
} from 'lucide-react';
import type { AppView } from '../lib/store';

interface Props {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const NAV_ITEMS: { view: AppView; icon: any; label: string; accent?: boolean }[] = [
  { view: 'upload', icon: Upload, label: 'Nauja analizė', accent: true },
  { view: 'history', icon: History, label: 'Istorija' },
  { view: 'settings', icon: Settings, label: 'Nustatymai' },
];

export default function Sidebar({ currentView, onNavigate, isOpen, onToggle }: Props) {
  return (
    <aside
      className={clsx(
        'relative flex flex-col h-full bg-gradient-sidebar backdrop-blur-2xl',
        'border-r border-white/[0.04] transition-all duration-300 ease-out-expo',
        isOpen ? 'w-[220px]' : 'w-[60px]',
      )}
    >
      {/* ── Brand ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.04]">
        <div
          className="w-8 h-8 rounded-[10px] bg-gradient-accent flex items-center justify-center flex-shrink-0
                     shadow-[0_2px_8px_rgba(255,140,10,0.25)]"
        >
          <FileSearch className="w-4 h-4 text-white" />
        </div>
        <div
          className={clsx(
            'overflow-hidden transition-all duration-300 ease-out-expo',
            isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0',
          )}
        >
          <span className="font-bold text-[13px] text-surface-100 whitespace-nowrap tracking-tight">
            Procurement
          </span>
          <span className="block text-[10px] text-surface-500 font-medium tracking-widest uppercase">
            Analyzer
          </span>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 pt-4 pb-2">
        {NAV_ITEMS.map(({ view, icon: Icon, label, accent }) => {
          const active = currentView === view;
          return (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              title={label}
              className={clsx(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium',
                'transition-all duration-200 ease-out-expo',
                active
                  ? 'text-white'
                  : 'text-surface-400 hover:text-surface-200',
              )}
            >
              {/* Active background */}
              {active && (
                <div
                  className={clsx(
                    'absolute inset-0 rounded-xl',
                    accent
                      ? 'bg-accent-500/12 border border-accent-500/15'
                      : 'bg-brand-500/12 border border-brand-500/15',
                  )}
                />
              )}

              {/* Hover background */}
              {!active && (
                <div className="absolute inset-0 rounded-xl bg-surface-700/0 group-hover:bg-surface-700/30 transition-colors duration-200" />
              )}

              <Icon
                className={clsx(
                  'w-[18px] h-[18px] flex-shrink-0 relative z-10 transition-colors duration-200',
                  active
                    ? accent ? 'text-accent-400' : 'text-brand-400'
                    : 'text-surface-500 group-hover:text-surface-300',
                )}
              />

              <span
                className={clsx(
                  'relative z-10 whitespace-nowrap overflow-hidden transition-all duration-300 ease-out-expo',
                  isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0',
                )}
              >
                {label}
              </span>

              {/* Active indicator dot */}
              {active && (
                <div
                  className={clsx(
                    'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full',
                    accent ? 'bg-accent-500' : 'bg-brand-500',
                  )}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── AI indicator ───────────────────────────────────────── */}
      {isOpen && (
        <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl bg-brand-500/6 border border-brand-500/8">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-[11px] font-semibold text-brand-300 tracking-tight">
              AI-Powered
            </span>
          </div>
          <p className="text-[10px] text-surface-500 mt-1 leading-relaxed">
            Claude Sonnet 4 · OpenRouter
          </p>
        </div>
      )}

      {/* ── Collapse toggle ────────────────────────────────────── */}
      <div className="px-2 pb-3 border-t border-white/[0.04] pt-2">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-surface-500
                     hover:text-surface-300 hover:bg-surface-700/30 transition-all duration-200"
          title={isOpen ? 'Sutraukti' : 'Išskleisti'}
        >
          {isOpen ? (
            <PanelLeftClose className="w-[18px] h-[18px]" />
          ) : (
            <PanelLeft className="w-[18px] h-[18px]" />
          )}
          <span
            className={clsx(
              'text-[12px] font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-out-expo',
              isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0',
            )}
          >
            Sutraukti
          </span>
        </button>
      </div>
    </aside>
  );
}
