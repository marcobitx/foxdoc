// frontend/src/components/panels/NotesPanel.tsx
// Right panel for notes view — quick stats, popular tags, tips
// Shows when notes view is active
// Related: RightPanel.tsx, store.ts

import { useMemo } from 'react';
import { Lightbulb, Tag, StickyNote, Zap, CheckCircle2, Archive } from 'lucide-react';
import { appStore, useStore, setNotesFilter } from '../../lib/store';

export default function NotesPanel() {
  const { notesList, notesFilters } = useStore(appStore);

  const stats = useMemo(() => {
    const idea = notesList.filter((n) => n.status === 'idea').length;
    const inProgress = notesList.filter((n) => n.status === 'in_progress').length;
    const done = notesList.filter((n) => n.status === 'done').length;
    const archived = notesList.filter((n) => n.status === 'archived').length;
    return { total: notesList.length, idea, inProgress, done, archived };
  }, [notesList]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notesList) {
      for (const t of n.tags) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [notesList]);

  const statusBars = [
    { label: 'Idėjos', count: stats.idea, color: 'bg-blue-500/70', icon: Zap },
    { label: 'Vykdoma', count: stats.inProgress, color: 'bg-amber-500/70', icon: StickyNote },
    { label: 'Atlikta', count: stats.done, color: 'bg-emerald-500/70', icon: CheckCircle2 },
    { label: 'Archyvas', count: stats.archived, color: 'bg-surface-600/70', icon: Archive },
  ];

  const tips = [
    'Naudokite spalvas ir žymas greitam filtravimui',
    'Kanban rodinys leidžia tempti užrašus tarp stulpelių',
    'Prisekite svarbius užrašus — jie visada bus viršuje',
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {/* Stats */}
      <div className="px-6 py-4 border-b border-surface-700/20">
        <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-widest mb-3">
          Statistika
        </h3>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-[28px] font-extrabold text-white tracking-tighter leading-none">
            {stats.total}
          </span>
          <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">
            užrašų
          </span>
        </div>
        <div className="space-y-2">
          {statusBars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-2">
              <bar.icon className="w-3 h-3 text-surface-500 flex-shrink-0" />
              <span className="text-[11px] text-surface-400 w-16 font-medium">{bar.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${bar.color} transition-all duration-500`}
                  style={{ width: stats.total > 0 ? `${(bar.count / stats.total) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-[10px] font-mono text-surface-600 w-5 text-right">{bar.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {tagCounts.length > 0 && (
        <div className="px-6 py-4 border-b border-surface-700/20">
          <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Tag className="w-3 h-3" />
            Populiarios žymos
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {tagCounts.map(([tag, count]) => {
              const isActive = notesFilters.tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => {
                    const currentTags = notesFilters.tags;
                    setNotesFilter({
                      tags: isActive
                        ? currentTags.filter((t) => t !== tag)
                        : [...currentTags, tag],
                    });
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface-800/50 text-surface-400 border border-surface-700/30 hover:border-surface-600/50 hover:text-surface-300'
                  }`}
                >
                  {tag}
                  <span className="ml-1 text-surface-600">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="px-6 py-4">
        <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-widest mb-3">
          Patarimai
        </h3>
        <div className="space-y-2">
          {tips.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-surface-800/20 border border-surface-700/50"
            >
              <Lightbulb className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" />
              <span className="text-[11px] text-surface-400 leading-relaxed font-medium">{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
