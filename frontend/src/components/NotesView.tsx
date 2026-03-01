// frontend/src/components/NotesView.tsx
// Full notes manager — grid/list/kanban views, filtering, bulk actions, editor modal
// All UI text in Lithuanian. Follows HistoryView pattern for consistent design.
// Related: store.ts, api.ts, panels/NotesPanel.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import {
  Plus,
  Search,
  Trash2,
  Pin,
  PinOff,
  ArrowLeft,
  StickyNote,
  FileText,
  Clock,
  MoreHorizontal,
  Pencil,
  LayoutGrid,
  List,
  Columns3,
  X,
  Loader2,
  Lightbulb,
  Zap,
  CheckCircle2,
  Archive,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Tag,
  Palette,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import Tooltip from './Tooltip';
import { listAnalyses, type AnalysisSummary } from '../lib/api';
import {
  appStore,
  useStore,
  createNote,
  updateNote,
  deleteNote,
  togglePinNote,
  loadNotesFromServer,
  setNotesFilter,
  resetNotesFilters,
  setNotesSort,
  toggleNoteSelection,
  clearNoteSelection,
  bulkDeleteSelectedNotes,
  bulkChangeStatus,
  type Note,
  type NoteStatus,
  type NotePriority,
  type NoteColor,
  type NotesViewMode,
} from '../lib/store';

// ── Constants ─────────────────────────────────────────────────────────

const STATUS_META: Record<NoteStatus, { label: string; cls: string; icon: typeof Zap }> = {
  idea: { label: 'Idėja', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/20', icon: Lightbulb },
  in_progress: { label: 'Vykdoma', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/20', icon: Zap },
  done: { label: 'Atlikta', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20', icon: CheckCircle2 },
  archived: { label: 'Archyvas', cls: 'bg-surface-600/15 text-surface-400 border-surface-600/20', icon: Archive },
};

const PRIORITY_META: Record<NotePriority, { label: string; dot: string }> = {
  low: { label: 'Žemas', dot: 'bg-surface-500' },
  medium: { label: 'Vidutinis', dot: 'bg-amber-400' },
  high: { label: 'Aukštas', dot: 'bg-red-400' },
};

const COLOR_META: Record<NoteColor, { label: string; border: string; bg: string }> = {
  default: { label: 'Numatyta', border: 'border-l-surface-600/30', bg: 'bg-surface-600/10' },
  amber: { label: 'Geltona', border: 'border-l-amber-500/60', bg: 'bg-amber-500/10' },
  emerald: { label: 'Žalia', border: 'border-l-emerald-500/60', bg: 'bg-emerald-500/10' },
  blue: { label: 'Mėlyna', border: 'border-l-blue-500/60', bg: 'bg-blue-500/10' },
  red: { label: 'Raudona', border: 'border-l-red-500/60', bg: 'bg-red-500/10' },
  purple: { label: 'Violetinė', border: 'border-l-purple-500/60', bg: 'bg-purple-500/10' },
};

const VIEW_MODES: { mode: NotesViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { mode: 'grid', label: 'Kortelės', icon: LayoutGrid },
  { mode: 'list', label: 'Sąrašas', icon: List },
  { mode: 'kanban', label: 'Kanban', icon: Columns3 },
];

const KANBAN_COLUMNS: NoteStatus[] = ['idea', 'in_progress', 'done', 'archived'];

const KANBAN_STYLE: Record<NoteStatus, {
  gradient: string;
  headerBg: string;
  iconCls: string;
  countCls: string;
  dropGlow: string;
  emptyBorder: string;
  cardAccent: string;
}> = {
  idea: {
    gradient: 'from-blue-500/60 via-blue-400/30 to-blue-500/0',
    headerBg: 'bg-blue-500/[0.04]',
    iconCls: 'text-blue-400',
    countCls: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    dropGlow: 'border-blue-500/40 bg-blue-500/5 ring-1 ring-blue-500/20',
    emptyBorder: 'border-blue-500/10',
    cardAccent: 'hover:border-blue-500/30',
  },
  in_progress: {
    gradient: 'from-amber-500/60 via-amber-400/30 to-amber-500/0',
    headerBg: 'bg-amber-500/[0.04]',
    iconCls: 'text-amber-400',
    countCls: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    dropGlow: 'border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20',
    emptyBorder: 'border-amber-500/10',
    cardAccent: 'hover:border-amber-500/30',
  },
  done: {
    gradient: 'from-emerald-500/60 via-emerald-400/30 to-emerald-500/0',
    headerBg: 'bg-emerald-500/[0.04]',
    iconCls: 'text-emerald-400',
    countCls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    dropGlow: 'border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20',
    emptyBorder: 'border-emerald-500/10',
    cardAccent: 'hover:border-emerald-500/30',
  },
  archived: {
    gradient: 'from-surface-500/40 via-surface-500/20 to-surface-500/0',
    headerBg: 'bg-surface-700/[0.04]',
    iconCls: 'text-surface-500',
    countCls: 'bg-surface-700/30 text-surface-500 border-surface-600/20',
    dropGlow: 'border-surface-500/40 bg-surface-700/5 ring-1 ring-surface-500/20',
    emptyBorder: 'border-surface-700/10',
    cardAccent: 'hover:border-surface-500/30',
  },
};

// ── Helpers ─────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'ką tik';
  const min = Math.floor(sec / 60);
  if (min < 60) return `prieš ${min} min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `prieš ${h} val.`;
  const d = Math.floor(h / 24);
  if (d < 30) return `prieš ${d} d.`;
  return new Date(ts).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function excerpt(content: string, max = 120): string {
  if (!content.trim()) return 'Tuščias užrašas...';
  return content.length > max ? content.slice(0, max).trimEnd() + '...' : content;
}

function noteDisplayTitle(note: Note): string {
  if (note.title.trim()) return note.title;
  if (note.content.trim()) {
    const firstLine = note.content.split('\n')[0].trim();
    return firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine;
  }
  return 'Be pavadinimo';
}

// ── Grid Card ──────────────────────────────────────────────────────

function NoteGridCard({
  note,
  onOpen,
  isSelected,
  onToggleSelect,
  projectTitle,
}: {
  note: Note;
  onOpen: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  projectTitle?: string;
}) {
  const statusMeta = STATUS_META[note.status];
  const priorityMeta = PRIORITY_META[note.priority];
  const colorMeta = COLOR_META[note.color];
  const StatusIcon = statusMeta.icon;

  return (
    <div
      onClick={onOpen}
      className={clsx(
        'enterprise-card enterprise-card-hover cursor-pointer p-0 group relative',
        'flex flex-col min-h-[170px] overflow-hidden border-l-[3px]',
        colorMeta.border,
        isSelected && 'ring-1 ring-brand-500/30',
        note.pinned && 'ring-1 ring-brand-500/15',
      )}
    >
      <div className="p-4 pb-2 flex-1">
        {/* Top row: checkbox + pin + status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
              className={clsx(
                'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-150',
                isSelected
                  ? 'bg-brand-500/70 border-brand-500/70'
                  : 'border-surface-600 hover:border-brand-500/50 opacity-0 group-hover:opacity-100',
              )}
            >
              {isSelected && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4.5 7.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            {note.pinned && (
              <Tooltip content="Prisegtas užrašas" side="top">
                <Pin className="w-3 h-3 text-brand-400 fill-brand-400/30" />
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Tooltip content={`Prioritetas: ${priorityMeta.label}`} side="top">
              <div className={clsx('w-1.5 h-1.5 rounded-full', priorityMeta.dot)} />
            </Tooltip>
            <Tooltip content={`Statusas: ${statusMeta.label}`} side="top">
              <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-md border', statusMeta.cls)}>
                <StatusIcon className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />
                {statusMeta.label}
              </span>
            </Tooltip>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[13px] font-bold text-surface-100 tracking-tight line-clamp-2 group-hover:text-brand-300 transition-colors mb-1.5">
          {noteDisplayTitle(note)}
        </h3>

        {/* Excerpt */}
        <p className="text-[11px] text-surface-500 leading-relaxed line-clamp-3">
          {note.title.trim() ? excerpt(note.content) : ''}
        </p>
      </div>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {note.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-800/50 text-surface-400 border border-surface-700/30">
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-[9px] text-surface-600 font-bold">+{note.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Project badge */}
      {projectTitle && (
        <div className="px-4 pb-2">
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/15">
            <Briefcase className="w-2.5 h-2.5" />
            {projectTitle.length > 30 ? projectTitle.slice(0, 30) + '...' : projectTitle}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-surface-700/20 mt-auto">
        <div className="flex items-center gap-1.5 text-surface-600">
          <Clock className="w-3 h-3" />
          <span className="text-[10px] font-medium">{timeAgo(note.updatedAt)}</span>
        </div>
        {wordCount(note.content) > 0 && (
          <span className="text-[10px] font-medium text-surface-600">
            {wordCount(note.content)} žodž.
          </span>
        )}
      </div>
    </div>
  );
}

// ── List Row ───────────────────────────────────────────────────────

function NoteListRow({
  note,
  onOpen,
  isSelected,
  onToggleSelect,
  projectTitle,
}: {
  note: Note;
  onOpen: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  projectTitle?: string;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const statusMeta = STATUS_META[note.status];
  const priorityMeta = PRIORITY_META[note.priority];
  const StatusIcon = statusMeta.icon;

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  return (
    <div
      onClick={onOpen}
      className={clsx(
        'grid gap-0 px-4 py-3 w-full text-left border-b border-surface-700/20 last:border-b-0 group',
        'grid-cols-[28px_1fr_80px_80px] sm:grid-cols-[28px_minmax(120px,280px)_minmax(120px,1fr)_130px_120px_80px_80px] cursor-pointer',
        'transition-all duration-200 hover:bg-surface-800/50',
        isSelected && 'bg-brand-500/5 border-l-2 border-l-brand-500/40',
      )}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className={clsx(
            'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-150',
            isSelected
              ? 'bg-brand-500/70 border-brand-500/70'
              : 'border-surface-600 hover:border-brand-500/50 opacity-40 group-hover:opacity-100',
          )}
        >
          {isSelected && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4.5 7.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Title + tags */}
      <div className="min-w-0 pr-3">
        <div className="flex items-center gap-2">
          {note.pinned && <Pin className="w-3 h-3 text-brand-400 fill-brand-400/30 flex-shrink-0" />}
          <span className="text-[13px] font-bold text-surface-100 tracking-tight truncate group-hover:text-brand-300 transition-colors">
            {noteDisplayTitle(note)}
          </span>
        </div>
        {note.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            {note.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[9px] font-bold px-1 py-0 rounded bg-surface-800/50 text-surface-500 border border-surface-700/30">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Project */}
      <div className="hidden sm:flex items-center min-w-0">
        {projectTitle ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/15 truncate max-w-full">
            <Briefcase className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{projectTitle}</span>
          </span>
        ) : (
          <span className="text-[10px] text-surface-600">—</span>
        )}
      </div>

      {/* Priority */}
      <div className="hidden sm:flex items-center gap-1.5">
        <div className={clsx('w-2 h-2 rounded-full', priorityMeta.dot)} />
        <span className="text-[11px] text-surface-400 font-medium">{priorityMeta.label}</span>
      </div>

      {/* Status */}
      <div className="flex items-center">
        <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-md border', statusMeta.cls)}>
          <StatusIcon className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />
          {statusMeta.label}
        </span>
      </div>

      {/* Date */}
      <div className="hidden sm:flex items-center text-[11px] text-surface-500 font-medium">
        {timeAgo(note.updatedAt)}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1">
        <Tooltip content={confirmDelete ? 'Paspauskite dar kartą' : 'Ištrinti'} side="top">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              deleteNote(note.id);
            }}
            className={clsx(
              'p-1.5 rounded-lg transition-all duration-200',
              confirmDelete
                ? 'text-red-400 bg-red-500/15 border border-red-500/25 opacity-100'
                : 'text-surface-600 hover:text-red-400 hover:bg-red-500/8 opacity-0 group-hover:opacity-100',
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

// ── Kanban Card ────────────────────────────────────────────────────

function KanbanCard({
  note,
  onOpen,
  projectTitle,
}: {
  note: Note;
  onOpen: () => void;
  projectTitle?: string;
}) {
  const priorityMeta = PRIORITY_META[note.priority];
  const kanbanStyle = KANBAN_STYLE[note.status];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', note.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onOpen}
      className={clsx(
        'relative cursor-grab active:cursor-grabbing group overflow-hidden',
        'rounded-lg border border-surface-700/25 bg-surface-900/60',
        'transition-all duration-200 hover:shadow-lg hover:shadow-black/20',
        kanbanStyle.cardAccent,
        note.pinned && 'ring-1 ring-brand-500/15',
      )}
    >
      {/* Status accent bar at top */}
      <div className={clsx('h-[2px] bg-gradient-to-r', kanbanStyle.gradient)} />

      <div className="p-3">
        {/* Top row: priority + pin + time */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {note.priority === 'high' && (
              <span className="flex items-center gap-0.5 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 uppercase tracking-wider">
                <div className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                Svarbu
              </span>
            )}
            {note.priority === 'medium' && (
              <Tooltip content={`Prioritetas: ${priorityMeta.label}`} side="top">
                <div className={clsx('w-1.5 h-1.5 rounded-full', priorityMeta.dot)} />
              </Tooltip>
            )}
            {note.pinned && <Pin className="w-2.5 h-2.5 text-brand-400 fill-brand-400/30" />}
          </div>
          <span className="text-[9px] text-surface-600 font-medium tabular-nums">{timeAgo(note.updatedAt)}</span>
        </div>

        {/* Title */}
        <h4 className="text-[12px] font-bold text-surface-200 line-clamp-2 group-hover:text-white transition-colors leading-snug">
          {noteDisplayTitle(note)}
        </h4>

        {/* Content preview */}
        {note.content.trim() && note.title.trim() && (
          <p className="text-[10px] text-surface-600 line-clamp-2 mt-1 leading-relaxed">
            {excerpt(note.content, 80)}
          </p>
        )}

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-surface-800/60 text-surface-500 border border-surface-700/30">
                {tag}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="text-[8px] text-surface-600 font-bold">+{note.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Project badge */}
        {projectTitle && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-brand-500/8 text-brand-400/80 border border-brand-500/10">
              <Briefcase className="w-2 h-2" />
              {projectTitle.length > 20 ? projectTitle.slice(0, 20) + '...' : projectTitle}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────

function KanbanColumn({
  status,
  notes,
  onOpen,
  analysisMap,
}: {
  status: NoteStatus;
  notes: Note[];
  onOpen: (id: string) => void;
  analysisMap: Map<string, string>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const meta = STATUS_META[status];
  const style = KANBAN_STYLE[status];
  const StatusIcon = meta.icon;

  return (
    <div
      className={clsx(
        'flex flex-col flex-1 min-w-[240px] rounded-xl border overflow-hidden transition-all duration-200',
        dragOver ? style.dropGlow : 'border-surface-700/20 bg-surface-900/30',
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const noteId = e.dataTransfer.getData('text/plain');
        if (noteId) {
          updateNote(noteId, { status });
        }
      }}
    >
      {/* Colored top gradient bar */}
      <div className={clsx('h-[3px] bg-gradient-to-r', style.gradient)} />

      {/* Column header */}
      <div className={clsx('px-3.5 py-3 border-b border-surface-700/20 flex items-center gap-2.5', style.headerBg)}>
        <div className={clsx('w-6 h-6 rounded-lg flex items-center justify-center', meta.cls.split(' ')[0])}>
          <StatusIcon className={clsx('w-3.5 h-3.5', style.iconCls)} />
        </div>
        <span className="text-[12px] font-bold text-surface-200 uppercase tracking-wider">{meta.label}</span>
        <span className={clsx(
          'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border',
          notes.length > 0 ? style.countCls : 'bg-surface-800/30 text-surface-600 border-surface-700/20',
        )}>
          {notes.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2.5 space-y-2 overflow-y-auto scrollbar-thin min-h-[120px]">
        {notes.map((note) => (
          <KanbanCard
            key={note.id}
            note={note}
            onOpen={() => onOpen(note.id)}
            projectTitle={note.analysisId ? analysisMap.get(note.analysisId) : undefined}
          />
        ))}
        {notes.length === 0 && (
          <div className={clsx(
            'flex flex-col items-center justify-center py-8 rounded-lg border border-dashed transition-colors',
            dragOver ? style.emptyBorder : 'border-surface-700/15',
          )}>
            <StatusIcon className={clsx('w-5 h-5 mb-2 opacity-20', style.iconCls)} />
            <span className="text-[11px] text-surface-600 font-medium">Tempkite užrašus čia</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Note Editor Modal ──────────────────────────────────────────────

function NoteEditorModal({
  note,
  onClose,
  analyses,
}: {
  note: Note;
  onClose: () => void;
  analyses: AnalysisSummary[];
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!note.title && !note.content && titleRef.current) {
      titleRef.current.focus();
    }
  }, [note.id]);

  const debouncedUpdate = useCallback(
    (id: string, patch: Partial<Pick<Note, 'title' | 'content'>>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateNote(id, patch);
      }, 500);
    },
    [],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Optimistic local display handled by store
      debouncedUpdate(note.id, { title: e.target.value });
      // Immediate local state for responsiveness
      const updated = appStore.getState().notesList.map((n) =>
        n.id === note.id ? { ...n, title: e.target.value, updatedAt: Date.now() } : n,
      );
      appStore.setState({ notesList: updated });
    },
    [note.id, debouncedUpdate],
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      debouncedUpdate(note.id, { content: e.target.value });
      const updated = appStore.getState().notesList.map((n) =>
        n.id === note.id ? { ...n, content: e.target.value, updatedAt: Date.now() } : n,
      );
      appStore.setState({ notesList: updated });
    },
    [note.id, debouncedUpdate],
  );

  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteNote(note.id);
    onClose();
  }, [note.id, confirmDelete, onClose]);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !note.tags.includes(tag)) {
      updateNote(note.id, { tags: [...note.tags, tag] });
    }
    setTagInput('');
  }, [note.id, note.tags, tagInput]);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      updateNote(note.id, { tags: note.tags.filter((t) => t !== tag) });
    },
    [note.id, note.tags],
  );

  const words = wordCount(note.content);
  const chars = note.content.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-14 md:pt-16 px-3 sm:px-4 md:px-6 lg:px-8">
      {/* Backdrop — full-app blur overlay */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative w-full max-w-4xl flex flex-col overflow-hidden animate-fade-in-up',
          'rounded-2xl border border-surface-700/30',
          'bg-surface-900/95 backdrop-blur-md',
          'shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.03)]',
          'h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] md:h-auto md:max-h-[75vh]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-surface-700/20 flex-shrink-0">
          <button
            onClick={onClose}
            className="btn-ghost flex items-center gap-1.5 text-surface-400 hover:text-surface-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[13px]">Uždaryti</span>
          </button>

          <div className="flex items-center gap-2">
            <Tooltip content={note.pinned ? 'Atsegti nuo viršaus' : 'Prisegti prie viršaus'} side="bottom">
              <button
                onClick={() => togglePinNote(note.id)}
                className={clsx(
                  'btn-ghost flex items-center gap-1.5',
                  note.pinned ? 'text-brand-400' : 'text-surface-500',
                )}
              >
                {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                <span className="text-[12px] hidden sm:inline">{note.pinned ? 'Atsegti' : 'Prisegti'}</span>
              </button>
            </Tooltip>

            <Tooltip content="Pašalinti šį užrašą" side="bottom">
              <button
                onClick={handleDelete}
                className={clsx(
                  'btn-ghost flex items-center gap-1.5 transition-all duration-200',
                  confirmDelete
                    ? 'text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg'
                    : 'text-surface-500 hover:text-red-400',
                )}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[12px]">{confirmDelete ? 'Tikrai ištrinti?' : 'Ištrinti'}</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Project selector — full width for long names */}
        <div className="flex items-center gap-3 pl-4 sm:pl-6 pr-4 sm:pr-5 py-2.5 border-b border-surface-700/20 flex-shrink-0">
          <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest flex items-center gap-1.5 flex-shrink-0">
            <Briefcase className="w-3.5 h-3.5" />
            Projektas
          </label>
          <div className="flex-1 min-w-0">
            <CustomSelect
              value={note.analysisId || '__none__'}
              onChange={(val) => updateNote(note.id, { analysisId: val === '__none__' ? null : val })}
              options={[
                { value: '__none__', label: 'Nepriskirtas' },
                ...analyses
                  .filter((a) => a.status === 'completed')
                  .map((a) => {
                    const title = a.project_title || `Analizė ${a.id.slice(0, 8)}`;
                    const ref = a.procurement_reference ? ` [${a.procurement_reference}]` : '';
                    const date = a.created_at
                      ? ` · ${new Date(a.created_at).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })}`
                      : '';
                    return { value: a.id, label: `${title}${ref}${date}` };
                  }),
              ]}
              className="text-[11px]"
            />
          </div>
        </div>

        {/* Content area */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Left: title + content */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <input
              ref={titleRef}
              type="text"
              value={note.title}
              onChange={handleTitleChange}
              placeholder="Užrašo pavadinimas..."
              className="w-full bg-transparent text-white text-[18px] sm:text-[20px] font-bold tracking-tight px-4 sm:px-6 pt-4 sm:pt-5 pb-3 placeholder-surface-600 focus:outline-none border-b border-surface-700/20 flex-shrink-0"
            />
            <textarea
              value={note.content}
              onChange={handleContentChange}
              placeholder="Rašykite savo pastabas čia..."
              className="w-full flex-1 min-h-[120px] bg-transparent text-surface-100 text-[14px] leading-relaxed px-4 sm:px-6 py-4 resize-none placeholder-surface-600 focus:outline-none font-sans tracking-tight"
              spellCheck={false}
            />
          </div>

          {/* Properties sidebar — below editor on mobile, right side on desktop */}
          <div className="border-t md:border-t-0 md:border-l border-surface-700/20 flex-shrink-0 overflow-y-auto scrollbar-thin md:w-[200px]">
            <div className="p-3 space-y-3">
              {/* Status — compact inline chips */}
              <div>
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1.5 block">Statusas</label>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(STATUS_META) as NoteStatus[]).map((s) => {
                    const m = STATUS_META[s];
                    const Icon = m.icon;
                    return (
                      <button
                        key={s}
                        onClick={() => updateNote(note.id, { status: s })}
                        className={clsx(
                          'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all duration-150',
                          note.status === s
                            ? `${m.cls} border`
                            : 'text-surface-400 hover:bg-surface-800/50 border border-transparent',
                        )}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority — compact inline chips */}
              <div>
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1.5 block">Prioritetas</label>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(PRIORITY_META) as NotePriority[]).map((p) => {
                    const m = PRIORITY_META[p];
                    return (
                      <button
                        key={p}
                        onClick={() => updateNote(note.id, { priority: p })}
                        className={clsx(
                          'flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all duration-150',
                          note.priority === p
                            ? 'bg-surface-800/80 text-surface-200 border border-surface-600/40'
                            : 'text-surface-400 hover:bg-surface-800/50 border border-transparent',
                        )}
                      >
                        <div className={clsx('w-2 h-2 rounded-full', m.dot)} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1.5 flex items-center gap-1 block">
                  <Tag className="w-3 h-3" />
                  Žymos
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {note.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-800/50 text-surface-300 border border-surface-700/30">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                    placeholder="Nauja žyma..."
                    className="flex-1 bg-surface-800/30 border border-surface-700/30 rounded-md px-2 py-1 text-[11px] text-surface-300 placeholder-surface-600 focus:outline-none focus:border-brand-500/30"
                  />
                  <button onClick={handleAddTag} className="px-2 py-1 rounded-md text-[11px] font-bold text-brand-400 hover:bg-brand-500/10 transition-colors">
                    +
                  </button>
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1.5 flex items-center gap-1 block">
                  <Palette className="w-3 h-3" />
                  Spalva
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(COLOR_META) as NoteColor[]).map((c) => {
                    const m = COLOR_META[c];
                    return (
                      <Tooltip key={c} content={m.label} side="top">
                        <button
                          onClick={() => updateNote(note.id, { color: c })}
                          className={clsx(
                            'w-6 h-6 rounded-md border-2 transition-all duration-150',
                            m.bg,
                            note.color === c ? 'border-white/50 scale-110' : 'border-transparent hover:border-surface-500/50',
                          )}
                        />
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-t border-surface-700/20 bg-surface-900/50 flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 text-surface-600">
              <FileText className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">{words > 0 ? `${words} žodž.` : 'Tuščia'}</span>
            </div>
            {chars > 0 && (
              <span className="text-[11px] font-medium text-surface-700">{chars} simb.</span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] text-surface-600 font-medium">Redaguota {timeAgo(note.updatedAt)}</span>
            <span className="text-[10px] text-surface-700 hidden sm:inline">Sukurta {timeAgo(note.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Delete Button ─────────────────────────────────────────────

function BulkDeleteButton({ count, onConfirm }: { count: number; onConfirm: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  return (
    <button
      onClick={() => {
        if (!confirmDelete) {
          setConfirmDelete(true);
          return;
        }
        onConfirm();
        setConfirmDelete(false);
      }}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all duration-200',
        confirmDelete
          ? 'text-red-300 bg-red-500/20 border border-red-500/30 ring-1 ring-red-500/20'
          : 'text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20',
      )}
    >
      <Trash2 className="w-3.5 h-3.5" />
      {confirmDelete ? `Tikrai ištrinti ${count}?` : 'Ištrinti'}
    </button>
  );
}

// ── Main View ─────────────────────────────────────────────────────

export default function NotesView() {
  const state = useStore(appStore);
  const {
    notesList,
    activeNoteId,
    notesLoading,
    notesError,
    notesViewMode,
    notesFilters,
    notesSortField,
    notesSortDir,
    notesSelectedIds,
    notesPage,
    notesPerPage,
  } = state;

  // Analyses cache for project linking
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  // Load notes + analyses on mount
  useEffect(() => {
    loadNotesFromServer();
    listAnalyses(100, 0).then(setAnalyses).catch(() => {});
  }, []);

  // Map analysisId → project title for quick lookups
  const analysisMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of analyses) {
      map.set(a.id, a.project_title || `Analizė ${a.id.slice(0, 8)}`);
    }
    return map;
  }, [analyses]);

  const activeNote = useMemo(
    () => (activeNoteId ? notesList.find((n) => n.id === activeNoteId) : null),
    [notesList, activeNoteId],
  );

  // ── Filtered & sorted ────────────────────────────────────────────
  const filteredNotes = useMemo(() => {
    let list = [...notesList];

    // Search filter (title + content + tags)
    if (notesFilters.search.trim()) {
      const q = notesFilters.search.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Status filter
    if (notesFilters.status !== 'all') {
      list = list.filter((n) => n.status === notesFilters.status);
    }

    // Priority filter
    if (notesFilters.priority !== 'all') {
      list = list.filter((n) => n.priority === notesFilters.priority);
    }

    // Tags filter
    if (notesFilters.tags.length > 0) {
      list = list.filter((n) => notesFilters.tags.some((t) => n.tags.includes(t)));
    }

    // Project filter
    if (notesFilters.analysisId !== 'all') {
      if (notesFilters.analysisId === '__unlinked__') {
        list = list.filter((n) => !n.analysisId);
      } else {
        list = list.filter((n) => n.analysisId === notesFilters.analysisId);
      }
    }

    // Sort: pinned first, then by sort field
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

      let cmp = 0;
      switch (notesSortField) {
        case 'updated_at':
          cmp = a.updatedAt - b.updatedAt;
          break;
        case 'created_at':
          cmp = a.createdAt - b.createdAt;
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title, 'lt');
          break;
        case 'priority':
          cmp = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
          break;
      }
      return notesSortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [notesList, notesFilters, notesSortField, notesSortDir]);

  // ── Pagination (grid & list only) ──────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / notesPerPage));
  const safePage = Math.min(notesPage, totalPages - 1);
  // Reset page to 0 when filters change total count
  useEffect(() => {
    if (notesPage >= totalPages) appStore.setState({ notesPage: 0 });
  }, [totalPages, notesPage]);

  const paginatedNotes = useMemo(() => {
    if (notesViewMode === 'kanban') return filteredNotes;
    const start = safePage * notesPerPage;
    return filteredNotes.slice(start, start + notesPerPage);
  }, [filteredNotes, safePage, notesPerPage, notesViewMode]);

  // ── Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: notesList.length,
    idea: notesList.filter((n) => n.status === 'idea').length,
    inProgress: notesList.filter((n) => n.status === 'in_progress').length,
    done: notesList.filter((n) => n.status === 'done').length,
    highPriority: notesList.filter((n) => n.priority === 'high').length,
  }), [notesList]);

  // ── Kanban grouped notes ──────────────────────────────────────────
  const kanbanGroups = useMemo(() => {
    const groups: Record<NoteStatus, Note[]> = { idea: [], in_progress: [], done: [], archived: [] };
    for (const note of filteredNotes) {
      groups[note.status].push(note);
    }
    return groups;
  }, [filteredNotes]);

  const handleCreateNote = useCallback(async (analysisId?: string) => {
    await createNote(analysisId);
  }, []);

  const SortIcon = ({ field }: { field: typeof notesSortField }) => {
    if (notesSortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return notesSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-brand-400" />
      : <ArrowDown className="w-3 h-3 text-brand-400" />;
  };

  const hasActiveFilters = notesFilters.search || notesFilters.status !== 'all' || notesFilters.priority !== 'all' || notesFilters.tags.length > 0 || notesFilters.analysisId !== 'all';

  return (
    <div className="w-full animate-fade-in-up">
      {/* ── Editor Modal (portaled to body for full-screen backdrop blur) ── */}
      {activeNote && createPortal(
        <NoteEditorModal
          note={activeNote}
          onClose={() => appStore.setState({ activeNoteId: null })}
          analyses={analyses}
        />,
        document.body,
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Užrašai</h1>
          <p className="text-[11px] md:text-[12px] text-surface-500 mt-1.5 font-bold uppercase tracking-widest">
            {notesLoading
              ? '...'
              : `${notesList.length} užrašų · ${stats.idea} idėjos · ${stats.done} atlikta`}
          </p>
        </div>
        <div className="flex-shrink-0">
          <Tooltip content="Sukurti naują užrašą" side="bottom">
            <button onClick={() => handleCreateNote()} className="btn-professional group">
              <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" />
              <span className="hidden sm:inline">Naujas užrašas</span>
              <span className="sm:hidden">Naujas</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────── */}
      {notesLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────── */}
      {notesError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/15 text-[12px] text-red-300 animate-fade-in">
          {notesError}
        </div>
      )}

      {/* ── Empty ────────────────────────────────────────────── */}
      {!notesLoading && notesList.length === 0 && (
        <div className="animate-fade-in space-y-4">
          {/* Hero card */}
          <div className="enterprise-card relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand-500/0 via-brand-500/40 to-brand-500/0" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />

            <div className="relative flex flex-col md:flex-row items-center gap-6 p-6 md:p-8">
              {/* Left: Icon + text */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/8 border border-brand-500/15 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-brand-400 uppercase tracking-widest">Naujas modulis</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-2">
                  Fiksuokite pastabas analizės metu
                </h2>
                <p className="text-[13px] text-surface-400 leading-relaxed max-w-md">
                  Kurkite užrašus, grupuokite pagal statusą ir prioritetą, naudokite Kanban lentą idėjoms sekti.
                </p>
                <button onClick={() => handleCreateNote()} className="btn-professional mt-5 group">
                  <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" />
                  Sukurti pirmą užrašą
                </button>
              </div>

              {/* Right: Preview cards stack */}
              <div className="relative w-full md:w-[280px] h-[180px] flex-shrink-0 hidden md:block">
                {/* Back card */}
                <div className="absolute top-2 left-4 right-0 h-[140px] rounded-xl border border-surface-700/20 bg-surface-800/40 rotate-2 opacity-40" />
                {/* Middle card */}
                <div className="absolute top-1 left-2 right-2 h-[140px] rounded-xl border border-surface-700/25 bg-surface-800/50 rotate-1 opacity-60" />
                {/* Front card */}
                <div className="absolute top-0 left-0 right-4 rounded-xl border border-surface-700/30 bg-surface-800/70 p-4 border-l-[3px] border-l-amber-500/60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/20">
                        <Lightbulb className="w-2.5 h-2.5 inline mr-0.5 -mt-px" /> Idėja
                      </span>
                    </div>
                    <Pin className="w-3 h-3 text-brand-400/40" />
                  </div>
                  <div className="h-2.5 w-3/4 bg-surface-600/30 rounded mb-2" />
                  <div className="h-2 w-full bg-surface-700/20 rounded mb-1.5" />
                  <div className="h-2 w-5/6 bg-surface-700/20 rounded mb-3" />
                  <div className="flex gap-1">
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-surface-800/50 text-surface-500 border border-surface-700/30">pirkimas</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-surface-800/50 text-surface-500 border border-surface-700/30">pastaba</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature hints */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: LayoutGrid,
                title: 'Kortelės ir sąrašai',
                desc: 'Peržiūrėkite užrašus kortelių, sąrašo arba Kanban vaizdu',
                accent: 'from-blue-500/10 to-transparent',
                iconCls: 'text-blue-400',
              },
              {
                icon: Tag,
                title: 'Žymos ir filtrai',
                desc: 'Pridėkite žymas, filtruokite pagal statusą ir prioritetą',
                accent: 'from-amber-500/10 to-transparent',
                iconCls: 'text-amber-400',
              },
              {
                icon: Columns3,
                title: 'Kanban lenta',
                desc: 'Vilkite užrašus tarp stulpelių — nuo idėjos iki atlikto',
                accent: 'from-emerald-500/10 to-transparent',
                iconCls: 'text-emerald-400',
              },
            ].map((feat) => (
              <div key={feat.title} className="enterprise-card p-4 relative overflow-hidden group hover:border-surface-600/40 transition-all duration-300">
                <div className={clsx('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300', feat.accent)} />
                <div className="relative">
                  <feat.icon className={clsx('w-5 h-5 mb-2.5', feat.iconCls)} />
                  <h3 className="text-[13px] font-bold text-surface-200 mb-1">{feat.title}</h3>
                  <p className="text-[11px] text-surface-500 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dashboard (when notes exist) ─────────────────────── */}
      {!notesLoading && notesList.length > 0 && (
        <>
          {/* ── KPI Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-5">
            {[
              {
                val: stats.total, label: 'Viso',
                glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
                gradient: 'from-brand-500/50 via-brand-400/20 to-brand-600/50',
                icon: <img src="/icons/kpi-total.svg" alt="" className="w-6 h-6" />,
              },
              {
                val: stats.idea, label: 'Idėjos',
                glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
                gradient: 'from-blue-500/50 via-blue-400/20 to-blue-600/50',
                icon: <img src="/icons/kpi-ideas.svg" alt="" className="w-6 h-6" />,
              },
              {
                val: stats.inProgress, label: 'Vykdoma',
                glow: 'shadow-[0_0_15px_rgba(245,158,11,0.12)]',
                gradient: 'from-amber-500/50 via-yellow-400/20 to-amber-600/50',
                icon: <img src="/icons/kpi-progress.svg" alt="" className="w-6 h-6" />,
              },
              {
                val: stats.done, label: 'Atlikta',
                glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
                gradient: 'from-emerald-500/50 via-emerald-400/20 to-emerald-600/50',
                icon: <img src="/icons/kpi-completed.svg" alt="" className="w-6 h-6" />,
              },
              {
                val: stats.highPriority, label: 'Aukštas prior.',
                glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]',
                gradient: 'from-red-500/50 via-red-400/20 to-red-600/50',
                icon: <img src="/icons/kpi-priority.svg" alt="" className="w-6 h-6" />,
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className={`group rounded-xl p-[6px] bg-gradient-to-br ${kpi.gradient} ${kpi.glow}
                  transition-all duration-500 ease-out hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]`}
              >
                <div className="rounded-[9px] bg-[#3a332c] px-5 py-4 h-full">
                  <div className="text-surface-500 mb-3 transition-colors duration-300 group-hover:text-surface-300">
                    {kpi.icon}
                  </div>
                  <span className="text-[26px] font-bold text-white tracking-tight leading-none">
                    {kpi.val}
                  </span>
                  <p className="text-[10px] text-surface-500 font-semibold uppercase tracking-widest mt-1.5">
                    {kpi.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter Bar — two rows ────────────────────────── */}
          <div className="space-y-2 mb-4">
            {/* Row 1: Search + filter dropdowns */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="text"
                  value={notesFilters.search}
                  onChange={(e) => setNotesFilter({ search: e.target.value })}
                  placeholder="Ieškoti pagal pavadinimą, turinį, žymas..."
                  className="input-field w-full pl-10 py-2.5 text-[13px]"
                />
                {notesFilters.search && (
                  <button
                    onClick={() => setNotesFilter({ search: '' })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status dropdown */}
              <CustomSelect
                value={notesFilters.status}
                onChange={(val) => setNotesFilter({ status: val as any })}
                options={[
                  { value: 'all', label: 'Visi statusai' },
                  { value: 'idea', label: 'Idėjos' },
                  { value: 'in_progress', label: 'Vykdoma' },
                  { value: 'done', label: 'Atlikta' },
                  { value: 'archived', label: 'Archyvas' },
                ]}
                className="text-[13px] min-w-[150px]"
              />

              {/* Priority dropdown */}
              <CustomSelect
                value={notesFilters.priority}
                onChange={(val) => setNotesFilter({ priority: val as any })}
                options={[
                  { value: 'all', label: 'Visi prior.' },
                  { value: 'high', label: 'Aukštas' },
                  { value: 'medium', label: 'Vidutinis' },
                  { value: 'low', label: 'Žemas' },
                ]}
                className="text-[13px] min-w-[150px]"
              />

              {/* Project filter dropdown */}
              <CustomSelect
                value={notesFilters.analysisId}
                onChange={(val) => setNotesFilter({ analysisId: val as any })}
                options={[
                  { value: 'all', label: 'Visi projektai' },
                  { value: '__unlinked__', label: 'Nepriskirti' },
                  ...analyses
                    .filter((a) => a.status === 'completed' && notesList.some((n) => n.analysisId === a.id))
                    .map((a) => ({
                      value: a.id,
                      label: a.project_title
                        ? a.project_title.length > 22 ? a.project_title.slice(0, 22) + '...' : a.project_title
                        : `Analizė ${a.id.slice(0, 8)}`,
                    })),
                ]}
                className="text-[13px] min-w-[150px]"
              />

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={resetNotesFilters}
                  className="text-[11px] font-bold text-surface-500 hover:text-surface-300 transition-colors whitespace-nowrap"
                >
                  Valyti filtrus
                </button>
              )}
            </div>

            {/* Row 2: Sort + view mode */}
            <div className="flex items-center justify-between gap-3">
              {/* Sort toggle */}
              <div className="flex items-center gap-1">
                {(['updated_at', 'created_at', 'title', 'priority'] as const).map((field) => {
                  const labels: Record<string, string> = {
                    updated_at: 'Red.',
                    created_at: 'Sukurta',
                    title: 'Pavad.',
                    priority: 'Prior.',
                  };
                  return (
                    <button
                      key={field}
                      onClick={() => setNotesSort(field)}
                      className={clsx(
                        'flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all duration-200',
                        notesSortField === field
                          ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                          : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/50 border border-transparent',
                      )}
                    >
                      {labels[field]}
                      <SortIcon field={field} />
                    </button>
                  );
                })}
              </div>

              {/* View mode switcher */}
              <div className="flex items-center rounded-lg border border-surface-700/30 overflow-hidden">
                {VIEW_MODES.map((vm) => (
                  <Tooltip key={vm.mode} content={vm.label} side="top">
                    <button
                      onClick={() => appStore.setState({ notesViewMode: vm.mode })}
                      className={clsx(
                        'p-2 transition-all duration-200',
                        notesViewMode === vm.mode
                          ? 'bg-brand-500/15 text-brand-400'
                          : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/50',
                      )}
                    >
                      <vm.icon className="w-4 h-4" />
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bulk Action Bar ──────────────────────────────────── */}
          {notesSelectedIds.size > 0 && (
            <div className="flex items-center justify-between px-5 py-3 mb-4 rounded-xl bg-brand-500/8 border border-brand-500/15 animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-bold text-brand-300">
                  {notesSelectedIds.size} pasirinkta
                </span>
                <button
                  onClick={clearNoteSelection}
                  className="text-[11px] font-medium text-surface-400 hover:text-surface-200 transition-colors"
                >
                  Atšaukti
                </button>
              </div>
              <div className="flex items-center gap-2">
                {/* Status change buttons */}
                {(Object.keys(STATUS_META) as NoteStatus[]).map((s) => {
                  const m = STATUS_META[s];
                  const Icon = m.icon;
                  return (
                    <button
                      key={s}
                      onClick={() => bulkChangeStatus(s)}
                      className={clsx(
                        'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border transition-all duration-200',
                        m.cls, 'hover:opacity-80',
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {m.label}
                    </button>
                  );
                })}
                {/* Bulk delete */}
                <BulkDeleteButton count={notesSelectedIds.size} onConfirm={bulkDeleteSelectedNotes} />
              </div>
            </div>
          )}

          {/* ── No results ────────────────────────────────────── */}
          {filteredNotes.length === 0 && (
            <div className="text-center py-16 enterprise-card animate-fade-in">
              <Search className="w-8 h-8 text-surface-600 mx-auto mb-4" />
              <p className="text-[14px] text-surface-400 font-medium">
                Nerasta užrašų pagal pasirinktus filtrus
              </p>
              <button onClick={resetNotesFilters} className="btn-ghost mt-3 text-[12px]">
                Valyti filtrus
              </button>
            </div>
          )}

          {/* ── Grid View ──────────────────────────────────────── */}
          {notesViewMode === 'grid' && filteredNotes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedNotes.map((note, i) => (
                <div key={note.id} className="animate-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                  <NoteGridCard
                    note={note}
                    onOpen={() => appStore.setState({ activeNoteId: note.id })}
                    isSelected={notesSelectedIds.has(note.id)}
                    onToggleSelect={() => toggleNoteSelection(note.id)}
                    projectTitle={note.analysisId ? analysisMap.get(note.analysisId) : undefined}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── List View ──────────────────────────────────────── */}
          {notesViewMode === 'list' && filteredNotes.length > 0 && (
            <div className="enterprise-card overflow-hidden">
              {/* Header */}
              <div className="grid gap-0 px-4 py-2.5 border-b border-surface-700/40 text-[11px] text-surface-500 font-bold uppercase tracking-widest grid-cols-[28px_1fr_80px_80px] sm:grid-cols-[28px_minmax(120px,280px)_minmax(120px,1fr)_130px_120px_80px_80px]">
                <span />
                <button onClick={() => setNotesSort('title')} className="flex items-center gap-1 text-left hover:text-surface-300 transition-colors">
                  Pavadinimas <SortIcon field="title" />
                </button>
                <span className="hidden sm:inline">Projektas</span>
                <button onClick={() => setNotesSort('priority')} className="hidden sm:flex items-center gap-1 hover:text-surface-300 transition-colors">
                  Prioritetas <SortIcon field="priority" />
                </button>
                <span>Statusas</span>
                <button onClick={() => setNotesSort('updated_at')} className="hidden sm:flex items-center gap-1 hover:text-surface-300 transition-colors">
                  Data <SortIcon field="updated_at" />
                </button>
                <span />
              </div>

              {/* Rows */}
              {paginatedNotes.map((note) => (
                <NoteListRow
                  key={note.id}
                  note={note}
                  onOpen={() => appStore.setState({ activeNoteId: note.id })}
                  isSelected={notesSelectedIds.has(note.id)}
                  onToggleSelect={() => toggleNoteSelection(note.id)}
                  projectTitle={note.analysisId ? analysisMap.get(note.analysisId) : undefined}
                />
              ))}
            </div>
          )}

          {/* ── Kanban View ────────────────────────────────────── */}
          {notesViewMode === 'kanban' && (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin" style={{ minHeight: '400px' }}>
              {KANBAN_COLUMNS.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  notes={kanbanGroups[status]}
                  onOpen={(id) => appStore.setState({ activeNoteId: id })}
                  analysisMap={analysisMap}
                />
              ))}
            </div>
          )}

          {/* ── Pagination Bar (grid & list only) ──────────────── */}
          {notesViewMode !== 'kanban' && filteredNotes.length > 0 && (
            <div className="flex items-center justify-between mt-5 px-1">
              {/* Per-page selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-surface-500 font-medium">Rodyti po</span>
                <div className="flex items-center rounded-lg border border-surface-700/30 overflow-hidden">
                  {[10, 25, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => appStore.setState({ notesPerPage: n, notesPage: 0 })}
                      className={clsx(
                        'px-2.5 py-1.5 text-[12px] font-bold transition-all duration-200',
                        notesPerPage === n
                          ? 'bg-brand-500/15 text-brand-400'
                          : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/50',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page info + nav */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-surface-500 font-medium tabular-nums">
                  {safePage * notesPerPage + 1}–{Math.min((safePage + 1) * notesPerPage, filteredNotes.length)} iš {filteredNotes.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => appStore.setState({ notesPage: safePage - 1 })}
                    disabled={safePage === 0}
                    className={clsx(
                      'p-1.5 rounded-lg transition-all duration-200',
                      safePage === 0
                        ? 'text-surface-700 cursor-not-allowed'
                        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50',
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] text-surface-400 font-bold tabular-nums min-w-[3ch] text-center">
                    {safePage + 1}/{totalPages}
                  </span>
                  <button
                    onClick={() => appStore.setState({ notesPage: safePage + 1 })}
                    disabled={safePage >= totalPages - 1}
                    className={clsx(
                      'p-1.5 rounded-lg transition-all duration-200',
                      safePage >= totalPages - 1
                        ? 'text-surface-700 cursor-not-allowed'
                        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50',
                    )}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
