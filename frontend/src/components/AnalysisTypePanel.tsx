// frontend/src/components/AnalysisTypePanel.tsx
// Slide panel for selecting analysis type — mirrors ModelPanel pattern
// Related: ModelPanel.tsx, store.ts, panels/SectionAnalysisType.tsx

import { useEffect, useState, useCallback } from 'react';
import { X, Zap, ClipboardList, ShieldAlert, Search, Pencil } from 'lucide-react';
import { appStore, useStore } from '../lib/store';
import { useFocusTrap } from '../lib/useFocusTrap';
import Tooltip from './Tooltip';
import { clsx } from 'clsx';

interface AnalysisTypeOption {
  id: string;
  icon: any;
  label: string;
  desc: string;
  recommended?: boolean;
}

const ANALYSIS_TYPES: AnalysisTypeOption[] = [
  { id: 'quick',        icon: Zap,           label: 'Greita apžvalga',  desc: 'Pagrindinė info: pavadinimas, vertė, terminai, organizacija. Greičiausias variantas.' },
  { id: 'requirements', icon: ClipboardList, label: 'Reikalavimai',     desc: 'Kvalifikacija, techninė specifikacija, vertinimo kriterijai, pateikimo reikalavimai.' },
  { id: 'risks',        icon: ShieldAlert,   label: 'Rizikų analizė',  desc: 'Rizikos, baudos, netesybos, terminai, sutarties sąlygos, finansinės garantijos.' },
  { id: 'detailed',     icon: Search,        label: 'Detali analizė',  desc: 'Pilna analizė — visi 13 laukų maksimaliai detaliai. Rekomenduojama naujam pirkimui.', recommended: true },
  { id: 'custom',       icon: Pencil,        label: 'Individuali',      desc: 'Aprašykite savo instrukcijas laisvu tekstu — AI analizuos pagal jūsų poreikius.' },
];

export default function AnalysisTypePanel() {
  const state = useStore(appStore);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    if (state.analysisTypePanelOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else if (visible) {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [state.analysisTypePanelOpen]);

  const handleClose = useCallback(() => {
    appStore.setState({ analysisTypePanelOpen: false });
  }, []);

  useEffect(() => {
    if (!state.analysisTypePanelOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.analysisTypePanelOpen, handleClose]);

  if (!visible) return null;

  const selectType = (id: string) => {
    appStore.setState({ selectedAnalysisType: id });
    if (id !== 'custom') handleClose();
  };

  const selected = state.selectedAnalysisType || 'detailed';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={clsx(
          "absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300",
          animating ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={trapRef}
        className={clsx(
          "relative w-full max-w-lg flex flex-col shadow-2xl",
          "bg-surface-950 border border-surface-700/60",
          "my-2 mr-2 rounded-[10px] overflow-hidden",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          animating
            ? "translate-x-0 opacity-100"
            : "translate-x-[105%] opacity-0"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Analizės tipo pasirinkimas"
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-surface-700/50 bg-surface-950/80 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-brand-400" />
            <h2 className="text-[14px] font-bold text-white uppercase tracking-wider">Analizės tipas</h2>
          </div>
          <Tooltip content="Uždaryti" side="bottom">
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-surface-400 hover:text-surface-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {ANALYSIS_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selected === type.id;
            return (
              <button
                key={type.id}
                onClick={() => selectType(type.id)}
                className={clsx(
                  "group relative w-full flex items-start gap-3.5 px-4 py-3.5 rounded-[10px] border transition-all duration-200 text-left overflow-hidden",
                  isSelected
                    ? "bg-surface-800/60 border-brand-500/40"
                    : "bg-surface-800/50 border-surface-600/30 hover:border-surface-500/50 hover:bg-surface-700/60"
                )}
              >
                {/* Left accent bar */}
                <div
                  className={clsx(
                    "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[10px] transition-all duration-200 bg-brand-400",
                    isSelected ? "opacity-100" : "opacity-0"
                  )}
                />

                <div className={clsx(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  isSelected
                    ? "bg-brand-500/15 border border-brand-500/25"
                    : "bg-surface-700/50 border border-surface-600/30"
                )}>
                  <Icon className={clsx(
                    "w-4 h-4 transition-colors",
                    isSelected ? "text-brand-400" : "text-surface-400"
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={clsx(
                      "text-[13px] font-bold leading-tight transition-colors",
                      isSelected ? "text-brand-300" : "text-surface-100"
                    )}>
                      {type.label}
                    </p>
                    {type.recommended && (
                      <span className="inline-flex items-center px-1.5 py-[1px] rounded-full text-[8px] font-bold uppercase tracking-wider text-brand-400 bg-brand-500/10 border border-brand-500/20">
                        Rekomenduojama
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-surface-500 mt-1 leading-snug">
                    {type.desc}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Custom instructions textarea */}
          {selected === 'custom' && (
            <div className="mt-3 animate-fade-in">
              <label className="block text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2 px-1">
                Jūsų instrukcijos
              </label>
              <textarea
                value={state.customAnalysisInstructions}
                onChange={(e) => appStore.setState({ customAnalysisInstructions: e.target.value })}
                placeholder="Aprašykite, kokios analizės norite. Pvz.: &quot;Išanalizuok tik susijusius su elektros darbais reikalavimus ir pateik subrangovo kvalifikacijos reikalavimus.&quot;"
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-900 border border-surface-700/50 text-[13px] text-surface-100 placeholder-surface-600 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none scrollbar-thin"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-1.5 rounded-lg bg-brand-500/15 text-brand-300 text-[12px] font-bold hover:bg-brand-500/25 transition-all"
                >
                  Patvirtinti
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-700/40 bg-surface-950/50 flex-shrink-0">
          <p className="text-[10px] text-surface-500 leading-relaxed italic">
            Analizės tipas nustato, kuriems laukams skiriamas didžiausias dėmesys.
          </p>
        </div>
      </div>
    </div>
  );
}
