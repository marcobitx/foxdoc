// frontend/src/components/panels/SectionAnalysisType.tsx
// Compact analysis type selector card shown in the right panel
// Shows type icon, name, and short description
// Related: AnalysisTypePanel.tsx, store.ts

import { ChevronRight, Zap, ClipboardList, ShieldAlert, Search, Pencil } from 'lucide-react';
import { appStore, useStore } from '../../lib/store';

const TYPE_META: Record<string, { icon: any; label: string; desc: string }> = {
  quick:        { icon: Zap,           label: 'Greita apžvalga',    desc: 'Pagrindinė info: pavadinimas, vertė, terminai' },
  requirements: { icon: ClipboardList, label: 'Reikalavimai',       desc: 'Kvalifikacija, techninė spec., vertinimo kriterijai' },
  risks:        { icon: ShieldAlert,   label: 'Rizikų analizė',    desc: 'Rizikos, baudos, netesybos, terminai' },
  detailed:     { icon: Search,        label: 'Detali analizė',     desc: 'Pilna analizė — visi laukai maksimaliai detaliai' },
  custom:       { icon: Pencil,        label: 'Individuali',        desc: 'Savo instrukcijos laisvu tekstu' },
};

export default function SectionAnalysisType() {
  const state = useStore(appStore);
  const type = state.selectedAnalysisType || 'detailed';
  const meta = TYPE_META[type] || TYPE_META.detailed;
  const Icon = meta.icon;

  return (
    <div className="p-4 bg-transparent">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-brand-400" />
          <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-widest">Analizės tipas</h3>
        </div>
        <button
          onClick={() => appStore.setState({ analysisTypePanelOpen: true })}
          className="text-[10px] text-brand-400 hover:text-brand-300 font-bold uppercase tracking-tight transition-colors flex items-center gap-1 group"
        >
          Keisti
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <button
        onClick={() => appStore.setState({ analysisTypePanelOpen: true })}
        className="w-full text-left p-3 rounded-xl border border-surface-600/30 bg-surface-800/50 hover:bg-surface-700/55 hover:border-surface-500/40 transition-all group overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-brand-500/8 border border-brand-500/15 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-brand-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-tight text-surface-50">
              {meta.label}
            </p>
            <p className="text-[11px] text-surface-500 mt-1 leading-snug">
              {meta.desc}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
