// frontend/src/components/HelpPanel.tsx
// Slide-over help panel — mirrors ModelPanel / AnalysisTypePanel design
// Opens from sidebar Help button — overlays main content
// Related: IconSidebar.tsx, store.ts

import { useState, useEffect, useCallback } from 'react';
import {
  X, Upload, MessageSquare, Download,
  ExternalLink, Mail,
} from 'lucide-react';
import { appStore, useStore } from '../lib/store';
import { FoxHelp, FoxBrain, FoxScroll } from './FoxIcons';
import { useFocusTrap } from '../lib/useFocusTrap';
import Tooltip from './Tooltip';
import { clsx } from 'clsx';

const WORKFLOW_STEPS = [
  { icon: Upload, title: 'Įkelkite dokumentus', desc: 'PDF, DOCX, XLSX arba ZIP failai — iki 20 failų, maks. 50MB.' },
  { icon: FoxBrain, title: 'AI analizė', desc: 'Sistema automatiškai ištraukia, agreguoja ir vertina duomenis.' },
  { icon: FoxScroll, title: 'Peržiūrėkite ataskaitą', desc: 'Struktūruota ataskaita su visais rastais duomenimis.' },
  { icon: MessageSquare, title: 'Užduokite klausimus', desc: 'Pokalbio funkcija leidžia klausti apie dokumentų turinį.' },
  { icon: Download, title: 'Eksportuokite', desc: 'Atsisiųskite ataskaitą PDF arba DOCX formatu.' },
];

const SHORTCUTS = [
  { keys: 'Alt + N', desc: 'Nauja analizė' },
  { keys: 'Alt + H', desc: 'Istorija' },
  { keys: 'Alt + U', desc: 'Užrašai' },
  { keys: 'Alt + K', desc: 'Kalendorius' },
  { keys: 'Alt + J', desc: 'Naujas užrašas' },
  { keys: 'Alt + ,', desc: 'Nustatymai' },
  { keys: 'Esc', desc: 'Uždaryti panelę / redaktorių' },
];

const SUPPORTED_FORMATS = ['PDF', 'DOCX', 'XLSX', 'PPTX', 'PNG', 'JPG', 'ZIP'];

export default function HelpPanel() {
  const state = useStore(appStore);
  const open = state.helpPanelOpen;
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else if (visible) {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    appStore.setState({ helpPanelOpen: false });
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, handleClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={clsx(
          "absolute inset-0 bg-black/20 backdrop-blur-md transition-opacity duration-300",
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
        aria-label="Pagalba"
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-surface-700/50 bg-surface-950/80 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <FoxHelp className="w-4 h-4 text-brand-400" />
            <h2 className="text-[14px] font-bold text-white uppercase tracking-wider">Pagalba</h2>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
          {/* ── Workflow ──────────────────────────────────── */}
          <section>
            <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-widest mb-3 px-1">
              Kaip naudotis
            </h3>
            <div className="space-y-1.5">
              {WORKFLOW_STEPS.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3.5 px-4 py-3 rounded-[10px] border border-surface-600/30 bg-surface-800/50 hover:bg-surface-700/60 hover:border-surface-500/50 transition-all duration-200"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/25 flex items-center justify-center">
                    <step.icon className="w-4 h-4 text-brand-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-surface-600">{i + 1}.</span>
                      <h4 className="text-[13px] font-bold text-surface-100 leading-tight">{step.title}</h4>
                    </div>
                    <p className="text-[11px] text-surface-500 mt-1 leading-snug">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Supported Formats ────────────────────────── */}
          <section>
            <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-widest mb-3 px-1">
              Palaikomi formatai
            </h3>
            <div className="flex flex-wrap gap-2 px-1">
              {SUPPORTED_FORMATS.map((fmt) => (
                <span
                  key={fmt}
                  className="px-2.5 py-1 rounded-lg bg-surface-800/60 text-[11px] font-bold text-surface-300 border border-surface-700/30"
                >
                  .{fmt}
                </span>
              ))}
            </div>
          </section>

          {/* ── Keyboard Shortcuts ───────────────────────── */}
          <section>
            <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-widest mb-3 px-1">
              Spartieji klavišai
            </h3>
            <div className="rounded-[10px] border border-surface-600/30 bg-surface-800/50 overflow-hidden divide-y divide-surface-700/20">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[12px] text-surface-300 font-medium">{s.desc}</span>
                  <kbd className="px-2 py-0.5 rounded-md bg-surface-900/80 text-[11px] font-mono font-bold text-surface-400 border border-surface-700/40">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </section>

          {/* ── Contact ──────────────────────────────────── */}
          <section>
            <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-widest mb-3 px-1">
              Reikia pagalbos?
            </h3>
            <a
              href="mailto:marcobitx@gmail.com"
              className="flex items-center gap-3.5 px-4 py-3 rounded-[10px] border border-surface-600/30 bg-surface-800/50 hover:bg-surface-700/60 hover:border-surface-500/50 transition-all duration-200"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/25 flex items-center justify-center">
                <Mail className="w-4 h-4 text-brand-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-surface-100 leading-tight">Rašykite mums</p>
                <p className="text-[11px] text-surface-500 mt-0.5">marcobitx@gmail.com</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-surface-600 ml-auto flex-shrink-0" />
            </a>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-700/40 bg-surface-950/50 flex-shrink-0">
          <p className="text-[10px] text-surface-500 leading-relaxed italic">
            foxDoc v1.0 — Viešųjų pirkimų dokumentų analizatorius
          </p>
        </div>
      </div>
    </div>
  );
}
