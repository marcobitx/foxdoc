// frontend/src/components/TopBar.tsx
// Persistent top bar — shows breadcrumbs, model indicator, and error alerts
// Always visible at the top of the main content area
// Related: App.tsx, store.ts

import { AlertTriangle, X, Cpu, Zap, Upload, History, Settings as SettingsIcon } from 'lucide-react';
import type { AppView } from '../lib/store';

interface Props {
  currentView: AppView;
  error: string | null;
  onDismissError: () => void;
}

const VIEW_META: Record<AppView, { label: string; icon: any }> = {
  upload: { label: 'Nauja analizė', icon: Upload },
  analyzing: { label: 'Analizuojama', icon: Zap },
  results: { label: 'Ataskaita', icon: Cpu },
  history: { label: 'Istorija', icon: History },
  settings: { label: 'Nustatymai', icon: SettingsIcon },
};

export default function TopBar({ currentView, error, onDismissError }: Props) {
  const meta = VIEW_META[currentView] || VIEW_META.upload;
  const Icon = meta.icon;

  return (
    <header className="flex-shrink-0 border-b border-white/[0.04] bg-surface-900/60 backdrop-blur-lg">
      <div className="flex items-center justify-between h-12 px-5 md:px-8">
        {/* Left — breadcrumb */}
        <div className="flex items-center gap-2.5">
          <Icon className="w-3.5 h-3.5 text-surface-500" />
          <span className="text-[13px] font-medium text-surface-300 tracking-tight">
            {meta.label}
          </span>
        </div>

        {/* Right — model indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-surface-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse-subtle" />
            <span className="font-mono">claude-sonnet-4</span>
          </div>
        </div>
      </div>

      {/* Error banner — slides in when error exists */}
      {error && (
        <div className="flex items-center gap-3 px-5 md:px-8 py-2 bg-red-500/8 border-t border-red-500/10 animate-fade-in">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="text-[13px] text-red-300 flex-1 truncate">{error}</span>
          <button
            onClick={onDismissError}
            className="p-1 rounded-md hover:bg-red-500/15 text-red-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </header>
  );
}
