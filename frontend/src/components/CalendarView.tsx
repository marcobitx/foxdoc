// frontend/src/components/CalendarView.tsx
// Calendar/Timeline view — visual monthly grid with analysis activity heatmap
// Shows KPI strip, month navigation, day cells with status dots, day detail panel
// Related: api.ts (listAnalyses), App.tsx, HistoryView.tsx

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
  FileText,
  Clock,
  Building2,
  Eye,
  CalendarDays,
  LayoutGrid,
  Rows3,
  X,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { listAnalyses, type AnalysisSummary } from '../lib/api';
import CustomSelect from './CustomSelect';
import ScrollText from './ScrollText';
import Tooltip from './Tooltip';
import LineDivider from './LineDivider';

interface Props {
  onSelect: (id: string) => void;
  onNew: () => void;
}

// ── Lithuanian locale ────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
  'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis',
];

const MONTH_NAMES_GEN = [
  'Sausio', 'Vasario', 'Kovo', 'Balandžio', 'Gegužės', 'Birželio',
  'Liepos', 'Rugpjūčio', 'Rugsėjo', 'Spalio', 'Lapkričio', 'Gruodžio',
];

const DAY_NAMES = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'];

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  QUEUED:      { label: 'Eilėje',      color: 'text-surface-400', dot: 'bg-surface-500' },
  PENDING:     { label: 'Eilėje',      color: 'text-surface-400', dot: 'bg-surface-500' },
  PARSING:     { label: 'Parsavimas',  color: 'text-brand-400',   dot: 'bg-brand-500' },
  EXTRACTING:  { label: 'Ištraukimas', color: 'text-brand-400',   dot: 'bg-brand-500' },
  AGGREGATING: { label: 'Agregavimas', color: 'text-brand-400',   dot: 'bg-brand-500' },
  EVALUATING:  { label: 'Vertinimas',  color: 'text-brand-400',   dot: 'bg-brand-500' },
  COMPLETED:   { label: 'Baigta',      color: 'text-emerald-400', dot: 'bg-emerald-500' },
  FAILED:      { label: 'Klaida',      color: 'text-red-400',     dot: 'bg-red-500' },
  CANCELED:    { label: 'Atšaukta',    color: 'text-surface-400', dot: 'bg-surface-500' },
};

type ViewMode = 'month' | 'week';

// ── Helpers ──────────────────────────────────────────────────────────────────

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const first = new Date(year, month, 1);
  // Monday-based week: getDay() returns 0=Sun, we want 0=Mon
  let startOffset = (first.getDay() + 6) % 7;
  // Fill previous month days
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }
  // Current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  // Fill remaining to complete grid (6 rows max)
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month + 1, days.length - startOffset - daysInMonth + 1));
  }
  return days;
}

function getWeekDays(refDate: Date): Date[] {
  const day = refDate.getDay();
  const mondayOffset = (day + 6) % 7;
  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() - mondayOffset);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatValue(amount: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function timeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CalendarView({ onSelect, onNew }: Props) {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [weekRef, setWeekRef] = useState(today);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [transitionDir, setTransitionDir] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setAnalyses(await listAnalyses(200, 0));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Filtered analyses ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return analyses;
    return analyses.filter((a) => a.status === statusFilter);
  }, [analyses, statusFilter]);

  // ── Group analyses by date key ─────────────────────────────────────────
  const byDate = useMemo(() => {
    const map = new Map<string, AnalysisSummary[]>();
    for (const a of filtered) {
      const key = dateKey(new Date(a.created_at));
      const arr = map.get(key) || [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [filtered]);

  // ── Month-level KPI ────────────────────────────────────────────────────
  const monthStats = useMemo(() => {
    const monthAnalyses = filtered.filter((a) => {
      const d = new Date(a.created_at);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const completed = monthAnalyses.filter((a) => a.status === 'COMPLETED');
    const totalValue = monthAnalyses.reduce((s, a) => s + (a.estimated_value || 0), 0);
    const withScore = monthAnalyses.filter((a) => a.completeness_score != null && a.completeness_score > 0);
    const avgScore = withScore.length > 0
      ? withScore.reduce((s, a) => s + (a.completeness_score || 0), 0) / withScore.length
      : 0;

    // Activity streak — consecutive days with analyses
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let maxStreak = 0;
    let streak = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(new Date(currentYear, currentMonth, d));
      if (byDate.has(key)) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 0;
      }
    }

    return {
      total: monthAnalyses.length,
      completed: completed.length,
      totalValue,
      avgScore,
      activeDays: new Set(monthAnalyses.map((a) => dateKey(new Date(a.created_at)))).size,
      maxStreak,
    };
  }, [filtered, currentYear, currentMonth, byDate]);

  // ── Max analyses per day (for heatmap intensity) ───────────────────────
  const maxPerDay = useMemo(() => {
    let max = 0;
    byDate.forEach((arr) => { if (arr.length > max) max = arr.length; });
    return max || 1;
  }, [byDate]);

  // ── Navigation ─────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setTransitionDir('left');
    setSelectedDay(null);
    if (viewMode === 'month') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((y) => y + 1);
      } else {
        setCurrentMonth((m) => m + 1);
      }
    } else {
      setWeekRef((d) => {
        const next = new Date(d);
        next.setDate(d.getDate() + 7);
        return next;
      });
    }
    setTimeout(() => setTransitionDir(null), 300);
  }, [viewMode, currentMonth]);

  const goPrev = useCallback(() => {
    setTransitionDir('right');
    setSelectedDay(null);
    if (viewMode === 'month') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((y) => y - 1);
      } else {
        setCurrentMonth((m) => m - 1);
      }
    } else {
      setWeekRef((d) => {
        const prev = new Date(d);
        prev.setDate(d.getDate() - 7);
        return prev;
      });
    }
    setTimeout(() => setTransitionDir(null), 300);
  }, [viewMode, currentMonth]);

  const goToday = useCallback(() => {
    setTransitionDir(null);
    setSelectedDay(null);
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setWeekRef(today);
  }, [today]);

  // ── Calendar days ──────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    return viewMode === 'month'
      ? getMonthDays(currentYear, currentMonth)
      : getWeekDays(weekRef);
  }, [viewMode, currentYear, currentMonth, weekRef]);

  // ── Selected day analyses ──────────────────────────────────────────────
  const selectedDayAnalyses = useMemo(() => {
    if (!selectedDay) return [];
    return byDate.get(selectedDay) || [];
  }, [selectedDay, byDate]);

  // ── Header label ───────────────────────────────────────────────────────
  const headerLabel = useMemo(() => {
    if (viewMode === 'month') {
      return `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    }
    const days = getWeekDays(weekRef);
    const first = days[0];
    const last = days[6];
    if (first.getMonth() === last.getMonth()) {
      return `${MONTH_NAMES_GEN[first.getMonth()]} ${first.getDate()}–${last.getDate()}, ${first.getFullYear()}`;
    }
    return `${MONTH_NAMES_GEN[first.getMonth()]} ${first.getDate()} – ${MONTH_NAMES_GEN[last.getMonth()]} ${last.getDate()}, ${last.getFullYear()}`;
  }, [viewMode, currentMonth, currentYear, weekRef]);

  return (
    <div className="w-full animate-fade-in-up">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 md:mb-8 gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Kalendorius
          </h1>
          <p className="text-[11px] md:text-[12px] text-surface-500 mt-1.5 font-bold uppercase tracking-widest truncate">
            {loading ? '...' : `${analyses.length} analizių · ${monthStats.activeDays} aktyvių dienų`}
          </p>
        </div>
        <Tooltip content="Pradėti naują dokumentų analizę" side="bottom">
          <button onClick={onNew} className="btn-professional group flex-shrink-0">
            <CalendarDays className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">Nauja analizė</span>
            <span className="sm:hidden">Nauja</span>
          </button>
        </Tooltip>
      </div>

      {/* ── Loading ───────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
        </div>
      )}

      {/* ── Empty ─────────────────────────────────────────────── */}
      {!loading && analyses.length === 0 && (
        <div className="text-center py-24 animate-fade-in enterprise-card">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand-500/5 flex items-center justify-center border border-brand-500/10">
            <Inbox className="w-8 h-8 text-brand-400" />
          </div>
          <p className="text-xl font-bold text-white mb-2 tracking-tight">Kalendorius tuščias</p>
          <p className="text-[14px] text-surface-500 max-w-xs mx-auto">
            Pradėkite naują analizę ir ji atsiras kalendoriuje.
          </p>
        </div>
      )}

      {/* ── Dashboard Content ────────────────────────────────── */}
      {!loading && analyses.length > 0 && (
        <>
          {/* ── KPI Strip ──────────────────────────────────────── */}
          <div className="relative rounded-2xl border border-surface-600/30 bg-surface-800/55 mb-6 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand-500/0 via-brand-500/40 to-brand-500/0" />

            <div className="grid grid-cols-2 lg:grid-cols-4">
              {/* Month analyses */}
              <div className="relative px-6 py-5 group">
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-extrabold text-white tracking-tighter leading-none">{monthStats.total}</span>
                  {monthStats.activeDays > 0 && (
                    <span className="text-[11px] font-bold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded-md">
                      {monthStats.activeDays} d.
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-surface-500 font-bold uppercase tracking-widest mt-1.5">Šį mėnesį</p>
                <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-brand-500/30" />
              </div>

              {/* Completed */}
              <div className="relative px-6 py-5 group">
                <LineDivider orientation="vertical" className="absolute left-0 inset-y-2" />
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-extrabold text-white tracking-tighter leading-none">{monthStats.completed}</span>
                  {monthStats.total > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1 rounded-full bg-surface-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/70"
                          style={{ width: `${Math.round((monthStats.completed / monthStats.total) * 100)}%`, transition: 'width 0.6s ease-out' }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-surface-600">{Math.round((monthStats.completed / monthStats.total) * 100)}%</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-surface-500 font-bold uppercase tracking-widest mt-1.5">Baigtos</p>
                <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-emerald-500/30" />
              </div>

              {/* Total Value */}
              <div className="relative px-6 py-5 group">
                <LineDivider orientation="vertical" className="absolute left-0 inset-y-2" />
                <span className="text-[32px] font-extrabold text-white tracking-tighter leading-none">
                  {monthStats.totalValue > 0
                    ? monthStats.totalValue >= 1_000_000
                      ? `${(monthStats.totalValue / 1_000_000).toFixed(1)}M`
                      : monthStats.totalValue >= 1_000
                        ? `${(monthStats.totalValue / 1_000).toFixed(0)}K`
                        : formatValue(monthStats.totalValue)
                    : '—'}
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <p className="text-[11px] text-surface-500 font-bold uppercase tracking-widest">Vertė</p>
                  {monthStats.totalValue > 0 && (
                    <span className="text-[10px] font-mono text-surface-600">EUR</span>
                  )}
                </div>
                <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-amber-500/30" />
              </div>

              {/* Activity Streak */}
              <div className="relative px-6 py-5 group">
                <LineDivider orientation="vertical" className="absolute left-0 inset-y-2" />
                <div className="flex items-baseline gap-1">
                  <span className="text-[32px] font-extrabold tracking-tighter leading-none"
                    style={{ color: monthStats.avgScore >= 0.8 ? '#34d399' : monthStats.avgScore >= 0.5 ? '#fbbf24' : monthStats.avgScore > 0 ? '#f87171' : 'white' }}>
                    {monthStats.avgScore > 0 ? Math.round(monthStats.avgScore * 100) : '—'}
                  </span>
                  {monthStats.avgScore > 0 && <span className="text-[16px] font-bold text-surface-500">%</span>}
                </div>
                <p className="text-[11px] text-surface-500 font-bold uppercase tracking-widest mt-1.5">Vid. kokybė</p>
                {monthStats.avgScore > 0 && (
                  <div className="absolute top-4 right-4 w-7 h-7">
                    <svg viewBox="0 0 28 28" className="w-full h-full -rotate-90">
                      <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(62,51,45,0.4)" strokeWidth="2" />
                      <circle cx="14" cy="14" r="11" fill="none"
                        stroke={monthStats.avgScore >= 0.8 ? '#34d399' : monthStats.avgScore >= 0.5 ? '#fbbf24' : '#f87171'}
                        strokeWidth="2" strokeLinecap="round"
                        strokeDasharray={`${monthStats.avgScore * 69.1} ${69.1 - monthStats.avgScore * 69.1}`}
                        style={{ transition: 'stroke-dasharray 0.8s ease-out' }} />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Calendar Controls ──────────────────────────────── */}
          <div className="flex items-center justify-between mb-4 gap-2">
            {/* Left: Navigation */}
            <div className="flex items-center gap-2">
              <Tooltip content="Ankstesnis" side="bottom">
                <button
                  onClick={goPrev}
                  className="p-2 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800/60 transition-all duration-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </Tooltip>

              <h2 className="text-[16px] md:text-[18px] font-bold text-white tracking-tight min-w-[200px] text-center">
                {headerLabel}
              </h2>

              <Tooltip content="Kitas" side="bottom">
                <button
                  onClick={goNext}
                  className="p-2 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800/60 transition-all duration-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip content="Šiandien" side="bottom">
                <button
                  onClick={goToday}
                  className="ml-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-surface-400 hover:text-brand-400
                             bg-surface-800/40 hover:bg-brand-500/10 border border-surface-700/30 hover:border-brand-500/20
                             transition-all duration-200"
                >
                  Šiandien
                </button>
              </Tooltip>
            </div>

            {/* Right: View toggle + filters */}
            <div className="flex items-center gap-2">
              {/* Status filter */}
              <CustomSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'Visi statusai' },
                  { value: 'COMPLETED', label: 'Baigtos' },
                  { value: 'FAILED', label: 'Su klaidomis' },
                  { value: 'PENDING', label: 'Laukiančios' },
                ]}
                className="text-[13px] min-w-[140px]"
              />

              {/* View toggle */}
              <div className="flex items-center bg-surface-800/60 rounded-lg border border-surface-700/30 p-0.5">
                <Tooltip content="Mėnesio vaizdas" side="bottom">
                  <button
                    onClick={() => setViewMode('month')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold transition-all duration-200
                      ${viewMode === 'month' ? 'bg-brand-500/15 text-brand-400' : 'text-surface-500 hover:text-surface-300'}`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mėnuo</span>
                  </button>
                </Tooltip>
                <Tooltip content="Savaitės vaizdas" side="bottom">
                  <button
                    onClick={() => setViewMode('week')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold transition-all duration-200
                      ${viewMode === 'week' ? 'bg-brand-500/15 text-brand-400' : 'text-surface-500 hover:text-surface-300'}`}
                  >
                    <Rows3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Savaitė</span>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* ── Calendar Grid ─────────────────────────────────── */}
          <div className="enterprise-card overflow-hidden mb-4">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-surface-700/40">
              {DAY_NAMES.map((d, i) => (
                <div key={d} className={`py-2.5 text-center text-[11px] font-bold uppercase tracking-widest
                  ${i >= 5 ? 'text-surface-600' : 'text-surface-500'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div
              className={`grid grid-cols-7 transition-all duration-300 ease-out ${
                transitionDir === 'left' ? 'animate-slide-left' :
                transitionDir === 'right' ? 'animate-slide-right' : ''
              }`}
            >
              {calendarDays.map((day, i) => {
                const key = dateKey(day);
                const isCurrentMonth = day.getMonth() === currentMonth;
                const isToday = isSameDay(day, today);
                const isSelected = selectedDay === key;
                const dayAnalyses = byDate.get(key) || [];
                const count = dayAnalyses.length;
                const intensity = count / maxPerDay;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const hasCompleted = dayAnalyses.some((a) => a.status === 'COMPLETED');
                const hasFailed = dayAnalyses.some((a) => a.status === 'FAILED');
                const hasInProgress = dayAnalyses.some((a) =>
                  ['PARSING', 'EXTRACTING', 'AGGREGATING', 'EVALUATING'].includes(a.status));

                return (
                  <button
                    key={`${key}-${i}`}
                    onClick={() => setSelectedDay(isSelected ? null : key)}
                    className={`relative group text-left transition-all duration-200
                      ${viewMode === 'week' ? 'min-h-[140px]' : 'min-h-[80px] md:min-h-[100px]'}
                      border-b border-r border-surface-700/20
                      ${i % 7 === 6 ? 'border-r-0' : ''}
                      ${!isCurrentMonth && viewMode === 'month' ? 'opacity-30' : ''}
                      ${isSelected ? 'bg-brand-500/8 ring-1 ring-inset ring-brand-500/30' : 'hover:bg-surface-800/40'}
                      ${isToday ? 'bg-brand-500/5' : ''}
                    `}
                  >
                    {/* Heatmap background */}
                    {count > 0 && (
                      <div
                        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                        style={{
                          background: `radial-gradient(ellipse at center, rgba(245, 158, 11, ${Math.min(intensity * 0.12, 0.12)}) 0%, transparent 70%)`,
                        }}
                      />
                    )}

                    {/* Day number */}
                    <div className="relative p-2 md:p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[13px] md:text-[14px] font-bold leading-none transition-colors
                          ${isToday
                            ? 'text-brand-400'
                            : isWeekend
                              ? 'text-surface-600'
                              : isCurrentMonth || viewMode === 'week'
                                ? 'text-surface-300'
                                : 'text-surface-600'
                          }`}>
                          {day.getDate()}
                        </span>

                        {/* Today indicator */}
                        {isToday && (
                          <span className="text-[9px] font-bold text-brand-400 bg-brand-500/15 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                            Šiandien
                          </span>
                        )}
                      </div>

                      {/* Status dots */}
                      {count > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {count <= 4 ? (
                            dayAnalyses.map((a) => (
                              <Tooltip key={a.id} content={a.project_title || `#${a.id.slice(0, 6)}`} side="top">
                                <div className={`w-2 h-2 rounded-full ${STATUS_META[a.status]?.dot || 'bg-surface-500'}
                                  transition-transform duration-200 group-hover:scale-125`} />
                              </Tooltip>
                            ))
                          ) : (
                            <>
                              {hasCompleted && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                              {hasFailed && <div className="w-2 h-2 rounded-full bg-red-500" />}
                              {hasInProgress && <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />}
                              <span className="text-[10px] font-bold text-surface-400 ml-0.5">{count}</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Week view — expanded detail in cell */}
                      {viewMode === 'week' && count > 0 && (
                        <div className="mt-2 space-y-1">
                          {dayAnalyses.slice(0, 4).map((a) => {
                            const status = STATUS_META[a.status] || STATUS_META.QUEUED;
                            return (
                              <div
                                key={a.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (a.status !== 'FAILED' && a.status !== 'CANCELED') onSelect(a.id);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-800/40 hover:bg-surface-700/50
                                           cursor-pointer transition-all duration-150 group/item"
                              >
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`} />
                                <span className="text-[11px] font-medium text-surface-300 group-hover/item:text-surface-100 truncate flex-1">
                                  {a.project_title || `#${a.id.slice(0, 6)}`}
                                </span>
                                <span className="text-[10px] font-mono text-surface-600">
                                  {timeStr(a.created_at)}
                                </span>
                              </div>
                            );
                          })}
                          {count > 4 && (
                            <span className="text-[10px] font-bold text-surface-500 pl-2">+{count - 4} daugiau</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Selected Day Detail Panel ──────────────────────── */}
          {selectedDay && (
            <div className="enterprise-card overflow-hidden animate-fade-in-up mb-4">
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-700/40">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-4 h-4 text-brand-400" />
                  <span className="text-[14px] font-bold text-white">
                    {(() => {
                      const [y, m, d] = selectedDay.split('-').map(Number);
                      return `${y} m. ${MONTH_NAMES_GEN[m - 1]} ${d} d.`;
                    })()}
                  </span>
                  <span className="text-[11px] font-bold text-surface-500 bg-surface-800/60 px-2 py-0.5 rounded-md">
                    {selectedDayAnalyses.length} {selectedDayAnalyses.length === 1 ? 'analizė' : 'analizės'}
                  </span>
                </div>
                <Tooltip content="Uždaryti" side="left">
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800/60 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>

              {/* Analyses list */}
              {selectedDayAnalyses.length === 0 ? (
                <div className="px-5 py-8 text-center text-[13px] text-surface-500">
                  Šią dieną analizių nebuvo.
                </div>
              ) : (
                <div className="divide-y divide-surface-700/20">
                  {selectedDayAnalyses.map((a, i) => {
                    const status = STATUS_META[a.status] || STATUS_META.QUEUED;
                    const clickable = a.status !== 'FAILED' && a.status !== 'CANCELED';
                    const score = a.completeness_score != null ? Math.round(a.completeness_score * 100) : null;
                    const scoreColor = score != null
                      ? score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
                      : '';

                    return (
                      <div
                        key={a.id}
                        className={`flex items-center gap-4 px-5 py-3.5 transition-all duration-200 animate-stagger
                          ${clickable ? 'hover:bg-surface-800/50 cursor-pointer' : 'opacity-60'}
                          group`}
                        style={{ animationDelay: `${i * 40}ms` }}
                        onClick={() => clickable && onSelect(a.id)}
                      >
                        {/* Status dot */}
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status.dot}
                          ${['PARSING', 'EXTRACTING', 'AGGREGATING', 'EVALUATING'].includes(a.status) ? 'animate-pulse' : ''}`} />

                        {/* Project info */}
                        <div className="flex-1 min-w-0">
                          <ScrollText className="text-[13px] font-bold text-surface-100 tracking-tight group-hover:text-brand-300 transition-colors">
                            {a.project_title || `Analizė #${a.id.slice(0, 8)}`}
                          </ScrollText>
                          <div className="flex items-center gap-2.5 mt-1">
                            <span className="flex items-center gap-1 text-[11px] text-surface-500">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              {timeStr(a.created_at)}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-surface-500">
                              <FileText className="w-3 h-3 flex-shrink-0" />
                              {a.file_count} {a.file_count === 1 ? 'failas' : 'failai'}
                            </span>
                            {a.organization_name && (
                              <span className="hidden md:flex items-center gap-1 text-[11px] text-surface-500">
                                <Building2 className="w-3 h-3 flex-shrink-0" />
                                {a.organization_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Value */}
                        <div className="hidden md:block text-right flex-shrink-0">
                          <span className={`text-[13px] font-bold tracking-tight ${
                            a.estimated_value ? 'text-amber-400' : 'text-surface-600'
                          }`}>
                            {formatValue(a.estimated_value)}
                          </span>
                        </div>

                        {/* Quality score */}
                        {score != null && (
                          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                            <div className="w-6 h-1 rounded-full bg-surface-700/60 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(score, 100)}%` }}
                              />
                            </div>
                            <span className={`text-[12px] font-bold font-mono ${scoreColor}`}>{score}%</span>
                          </div>
                        )}

                        {/* Status badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
                          ${a.status === 'COMPLETED' ? 'badge-success' :
                            a.status === 'FAILED' ? 'badge-error' :
                            ['PARSING', 'EXTRACTING', 'AGGREGATING', 'EVALUATING'].includes(a.status) ? 'badge-brand' : 'badge-neutral'}`}>
                          {status.label}
                        </span>

                        {/* View button */}
                        {clickable && (
                          <Tooltip content="Peržiūrėti ataskaitą" side="left">
                            <button
                              onClick={(e) => { e.stopPropagation(); onSelect(a.id); }}
                              className="p-1.5 rounded-lg text-brand-400 bg-brand-500/10 border border-brand-500/20
                                         hover:bg-brand-500/20 hover:border-brand-500/30 transition-all duration-200
                                         opacity-0 group-hover:opacity-100"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Mini Activity Heatmap (month overview) ─────────── */}
          {viewMode === 'month' && (
            <div className="enterprise-card overflow-hidden p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-3.5 h-3.5 text-brand-400" />
                <span className="text-[11px] font-bold text-surface-500 uppercase tracking-widest">
                  Mėnesio aktyvumas
                </span>
                {monthStats.maxStreak > 1 && (
                  <span className="flex items-center gap-1 ml-auto text-[10px] font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md">
                    <TrendingUp className="w-3 h-3" />
                    {monthStats.maxStreak} d. serija
                  </span>
                )}
              </div>

              <div className="flex gap-1 items-end h-10">
                {(() => {
                  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                  const bars = [];
                  for (let d = 1; d <= daysInMonth; d++) {
                    const key = dateKey(new Date(currentYear, currentMonth, d));
                    const count = byDate.get(key)?.length || 0;
                    const height = count > 0 ? Math.max(20, (count / maxPerDay) * 100) : 4;
                    const isT = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                    bars.push(
                      <Tooltip key={d} content={`${MONTH_NAMES_GEN[currentMonth]} ${d}: ${count} ${count === 1 ? 'analizė' : 'analizių'}`} side="top">
                        <button
                          onClick={() => {
                            const dayKey = dateKey(new Date(currentYear, currentMonth, d));
                            setSelectedDay(selectedDay === dayKey ? null : dayKey);
                          }}
                          className={`flex-1 rounded-sm transition-all duration-300 hover:opacity-80 min-w-[3px]
                            ${count > 0
                              ? isT ? 'bg-brand-400' : 'bg-brand-500/60'
                              : 'bg-surface-700/30'
                            }`}
                          style={{ height: `${height}%` }}
                        />
                      </Tooltip>,
                    );
                  }
                  return bars;
                })()}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-surface-700/20">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-surface-500">Baigta</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-500" />
                  <span className="text-[10px] text-surface-500">Vykdoma</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[10px] text-surface-500">Klaida</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-surface-500" />
                  <span className="text-[10px] text-surface-500">Kita</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
