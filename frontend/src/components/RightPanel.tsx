// frontend/src/components/RightPanel.tsx
// Context-dependent right sidebar (320px) — orchestrates sub-panels per view
// Pure orchestrator — all panel logic lives in panels/ directory
// Related: App.tsx, panels/

import { clsx } from 'clsx';
import { PanelRightClose, PanelRightOpen, BookMarked } from 'lucide-react';
import { appStore, useStore, type AppView } from '../lib/store';
import Tooltip from './Tooltip';
import UploadPanel from './panels/UploadPanel';
import AnalyzingPanel from './panels/AnalyzingPanel';
import ResultsPanel from './panels/ResultsPanel';
import TipsPanel from './panels/TipsPanel';
import NotesPanel from './panels/NotesPanel';
import SectionModelSelector from './panels/SectionModelSelector';

interface Props {
  currentView: AppView;
  analysisId: string | null;
}

/** Reusable fade wrapper — mirrors IconSidebar's FadeText (right-side: margin-right instead of margin-left) */
function FadeText({ expanded, children, className }: { expanded: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'whitespace-nowrap overflow-hidden transition-[opacity,max-width,margin] duration-300 ease-out',
        expanded ? 'opacity-100 max-w-[200px] mr-3' : 'opacity-0 max-w-0 mr-0',
        className,
      )}
    >
      {children}
    </span>
  );
}

export default function RightPanel({ currentView, analysisId }: Props) {
  const { tipsPanelOpen, rightPanelOpen } = useStore(appStore);

  const isNotesView = currentView === 'notes';
  const isTipsView = currentView === 'history' || currentView === 'settings';
  const expanded = isTipsView ? tipsPanelOpen : isNotesView ? rightPanelOpen : true;
  const toggle = () => {
    if (isTipsView) appStore.setState({ tipsPanelOpen: !tipsPanelOpen });
    else if (isNotesView) appStore.setState({ rightPanelOpen: !rightPanelOpen });
  };

  return (
    <aside
      className={clsx(
        'hidden lg:flex flex-col h-full bg-transparent flex-shrink-0 overflow-hidden relative',
        'transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        (isTipsView || isNotesView)
          ? expanded ? 'w-[320px]' : 'w-[60px]'
          : 'w-[320px]',
      )}
    >
      {/* Decorative cross divider — horizontal + vertical lines with dots */}
      <div className="absolute inset-0 pointer-events-none z-10" aria-hidden="true">
        {/* Horizontal line — from left edge to 12px right, at y=50% of top area */}
        <div className="absolute top-[20px] left-0 w-[10px] h-[1px] bg-surface-500/30" />
        {/* Vertical line — from junction down to near bottom */}
        <div className="absolute top-[20px] left-0 w-[1px] bottom-[20px] bg-surface-500/30" />
        {/* Dot — start of horizontal line */}
        <div className="absolute top-[20px] left-0 -translate-y-1/2 w-[4px] h-[4px] rounded-full bg-surface-500/40" />
        {/* Dot — end of horizontal line / junction */}
        <div className="absolute top-[20px] left-[10px] -translate-y-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full bg-surface-500/40" />
        {/* Dot — bottom end of vertical line */}
        <div className="absolute bottom-[20px] left-0 -translate-x-[calc(50%-0.5px)] w-[4px] h-[4px] rounded-full bg-surface-500/40" />
      </div>
      {/* Tips views — collapsible, identical pattern to IconSidebar */}
      {isTipsView && (
        <>
          {/* Toggle row — mirrors IconSidebar's controls row exactly */}
          <div className="flex items-center h-10 flex-shrink-0 mt-2 mb-1 px-3 transition-all duration-300">
            {/* Toggle button — pinned to right edge (anchored), identical to IconSidebar button on left */}
            <Tooltip content={expanded ? 'Uždaryti patarimus' : 'Atidaryti patarimus'} side="left">
            <button
              onClick={toggle}
              aria-label={expanded ? 'Uždaryti patarimus' : 'Atidaryti patarimus'}
              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800/50 transition-all duration-200 flex-shrink-0 order-last ml-auto"
            >
              <div className="relative w-[18px] h-[18px] overflow-hidden">
                <PanelRightClose
                  className={clsx(
                    'w-[18px] h-[18px] absolute inset-0 transition-all duration-300',
                    expanded ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90',
                  )}
                />
                <PanelRightOpen
                  className={clsx(
                    'w-[18px] h-[18px] absolute inset-0 transition-all duration-300',
                    expanded ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0',
                  )}
                />
              </div>
            </button>
            </Tooltip>

            {/* Fading label — mirrors IconSidebar's ml-auto profile button */}
            <div
              className={clsx(
                'overflow-hidden transition-[opacity,max-width] duration-300 ease-out',
                expanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0',
              )}
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <BookMarked className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                <span className="text-[13px] font-bold text-surface-400 tracking-wider uppercase">
                  Patarimai
                </span>
              </span>
            </div>
          </div>

          {/* Content — hidden when collapsed */}
          <div
            className={clsx(
              'flex-1 overflow-y-auto scrollbar-hide transition-opacity duration-300',
              expanded ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
          >
            <div className="w-[320px] p-3 pt-0 space-y-3">
              <div className="enterprise-card overflow-hidden">
                <TipsPanel view={currentView} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Notes view — collapsible, identical pattern to tips/history sidebar */}
      {isNotesView && (
        <>
          {/* Toggle row — mirrors history sidebar toggle exactly */}
          <div className="flex items-center h-10 flex-shrink-0 mt-2 mb-1 px-3 transition-all duration-300">
            <Tooltip content={expanded ? 'Uždaryti užrašus' : 'Atidaryti užrašus'} side="left">
            <button
              onClick={toggle}
              aria-label={expanded ? 'Uždaryti užrašus' : 'Atidaryti užrašus'}
              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800/50 transition-all duration-200 flex-shrink-0 order-last ml-auto"
            >
              <div className="relative w-[18px] h-[18px] overflow-hidden">
                <PanelRightClose
                  className={clsx(
                    'w-[18px] h-[18px] absolute inset-0 transition-all duration-300',
                    expanded ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90',
                  )}
                />
                <PanelRightOpen
                  className={clsx(
                    'w-[18px] h-[18px] absolute inset-0 transition-all duration-300',
                    expanded ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0',
                  )}
                />
              </div>
            </button>
            </Tooltip>

            <div
              className={clsx(
                'overflow-hidden transition-[opacity,max-width] duration-300 ease-out',
                expanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0',
              )}
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <BookMarked className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                <span className="text-[13px] font-bold text-surface-400 tracking-wider uppercase">
                  Užrašai
                </span>
              </span>
            </div>
          </div>

          {/* Content — hidden when collapsed */}
          <div
            className={clsx(
              'flex-1 overflow-hidden transition-opacity duration-300',
              expanded ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
          >
            <div className="w-[320px] h-full">
              <div className="enterprise-card overflow-hidden h-full mx-3">
                <NotesPanel />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Non-tips views — always expanded, no toggle */}
      {!isTipsView && !isNotesView && (
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-3 space-y-3">
            <div className="enterprise-card overflow-hidden">
              {currentView === 'upload' && <UploadPanel />}
              {currentView === 'analyzing' && <AnalyzingPanel />}
              {currentView === 'results' && analysisId && <ResultsPanel analysisId={analysisId} />}
            </div>

            <div className="enterprise-card overflow-hidden">
              <SectionModelSelector />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
