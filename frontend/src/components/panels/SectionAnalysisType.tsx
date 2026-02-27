// frontend/src/components/panels/SectionAnalysisType.tsx
// Compact analysis type selector card shown in the right panel
// Shows type icon, name, and short description
// Related: AnalysisTypePanel.tsx, store.ts

import { ChevronRight, Zap, ClipboardList, ShieldAlert, Search, Pencil } from 'lucide-react';
import { appStore, useStore } from '../../lib/store';
import Tooltip from '../Tooltip';

const TYPE_META: Record<string, { icon: any; label: string; desc: string; tooltip: string }> = {
  quick:        { icon: Zap,           label: 'Greita apžvalga',    desc: 'Pagrindinė info: pavadinimas, vertė, terminai',          tooltip: 'Greičiausias režimas — tik pagrindiniai laukai' },
  requirements: { icon: ClipboardList, label: 'Reikalavimai',       desc: 'Kvalifikacija, techninė spec., vertinimo kriterijai',    tooltip: 'Fokusuota į kvalifikaciją ir techninius reikalavimus' },
  risks:        { icon: ShieldAlert,   label: 'Rizikų analizė',    desc: 'Rizikos, baudos, netesybos, terminai',                   tooltip: 'Fokusuota į rizikas, baudas ir finansines sąlygas' },
  detailed:     { icon: Search,        label: 'Detali analizė',     desc: 'Pilna analizė — visi laukai maksimaliai detaliai',       tooltip: 'Pilna analizė su visais 13 laukų' },
  custom:       { icon: Pencil,        label: 'Individuali',        desc: 'Savo instrukcijos laisvu tekstu',                        tooltip: 'Analizė pagal jūsų laisvos formos instrukcijas' },
};

export default function SectionAnalysisType() {
  const state = useStore(appStore);
  const type = state.selectedAnalysisType || 'detailed';
  const meta = TYPE_META[type] || TYPE_META.detailed;
  const Icon = meta.icon;

  return (
    <div className="p-4 bg-transparent">
      <div className="flex items-center justify-between mb-3">
        <Tooltip content="Pasirinkite analizės fokusą ir detalumo lygį" side="left">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-brand-400" />
            <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-widest">Analizės tipas</h3>
          </div>
        </Tooltip>
        <Tooltip content="Pasirinkti analizės tipą" side="left">
          <button
            onClick={() => appStore.setState({ analysisTypePanelOpen: true })}
            className="text-[10px] text-brand-400 hover:text-brand-300 font-bold uppercase tracking-tight transition-colors flex items-center gap-1 group"
          >
            Keisti
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </Tooltip>
      </div>

      <Tooltip content={meta.tooltip} side="left" className="w-full">
        <button
          onClick={() => appStore.setState({ analysisTypePanelOpen: true })}
          className="w-full text-left p-3 rounded-xl border border-surface-600/30 bg-surface-800/50 hover:bg-surface-700/55 hover:border-surface-500/40 transition-all group overflow-hidden"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-brand-500/8 border border-brand-500/15 flex items-center justify-center">
              <Icon className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-bold leading-tight text-surface-50">
                  {meta.label}
                </p>
                {type === 'detailed' && (
                  <span className="inline-flex items-center px-1.5 py-[1px] rounded-full text-[7px] font-bold uppercase tracking-wider text-brand-400 bg-brand-500/10 border border-brand-500/20 flex-shrink-0">
                    Rekomenduojama
                  </span>
                )}
              </div>
              <p className="text-[11px] text-surface-500 mt-1 leading-snug">
                {meta.desc}
              </p>
            </div>
          </div>
        </button>
      </Tooltip>
    </div>
  );
}
