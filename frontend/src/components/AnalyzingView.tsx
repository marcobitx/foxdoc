// frontend/src/components/AnalyzingView.tsx
// Real-time analysis progress view — vertical timeline with animated steps
// Listens to SSE stream and shows pipeline stages with live events
// Related: api.ts (streamProgress), App.tsx

import { useEffect, useState, useRef } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Brain,
  Layers,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import { streamProgress, type SSEEvent } from '../lib/api';

interface Props {
  analysisId: string;
  onComplete: () => void;
  onError: (err: string) => void;
}

interface StepInfo {
  icon: any;
  label: string;
  detail: string;
  status: 'waiting' | 'active' | 'done' | 'error';
}

const STEP_ORDER = ['PARSING', 'EXTRACTING', 'AGGREGATING', 'EVALUATING', 'COMPLETED'];

function getStepIndex(status: string): number {
  const idx = STEP_ORDER.indexOf(status);
  return idx >= 0 ? idx : 0;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

export default function AnalyzingView({ analysisId, onComplete, onError }: Props) {
  const [currentStatus, setCurrentStatus] = useState('QUEUED');
  const [events, setEvents] = useState<Array<{ event: string; data: any; ts: number }>>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startRef = useRef(Date.now());

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // SSE stream
  useEffect(() => {
    const close = streamProgress(
      analysisId,
      (e: SSEEvent) => {
        setEvents((prev) => [...prev, { ...e, ts: Date.now() }]);
        if (e.event === 'status' && e.data?.status) setCurrentStatus(e.data.status);
        if (e.data?.event_type === 'status_change' && e.data?.new_status) setCurrentStatus(e.data.new_status);
      },
      () => {},
    );
    return close;
  }, [analysisId]);

  // Completion/failure
  useEffect(() => {
    if (currentStatus === 'COMPLETED') setTimeout(onComplete, 800);
    else if (currentStatus === 'FAILED') onError('Analizė nepavyko — bandykite dar kartą');
  }, [currentStatus, onComplete, onError]);

  // Build step states
  const steps: StepInfo[] = [
    { icon: FileText, label: 'Dokumentų parsavimas', detail: 'Docling konvertuoja failus', status: 'waiting' },
    { icon: Brain, label: 'Duomenų ištraukimas', detail: 'AI struktūrizuoja kiekvieną dokumentą', status: 'waiting' },
    { icon: Layers, label: 'Agregavimas', detail: 'Kryžminė dokumentų analizė', status: 'waiting' },
    { icon: Shield, label: 'Kokybės vertinimas', detail: 'Automatinis QA tikrinimas', status: 'waiting' },
  ];

  const activeIdx = getStepIndex(currentStatus);
  steps.forEach((step, i) => {
    if (i < activeIdx) step.status = 'done';
    else if (i === activeIdx && currentStatus !== 'COMPLETED') step.status = 'active';
    if (currentStatus === 'COMPLETED') step.status = 'done';
    if (currentStatus === 'FAILED' && i === activeIdx) step.status = 'error';
  });

  const isDone = currentStatus === 'COMPLETED';
  const isFailed = currentStatus === 'FAILED';

  // Progress events for detail log
  const fileEvents = events.filter(
    (e) => e.data?.event_type === 'file_parsed' || e.data?.event_type === 'extraction_completed',
  );

  return (
    <div className="max-w-xl mx-auto animate-fade-in-up">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <div className="relative w-16 h-16 mx-auto mb-5">
          {/* Glow ring behind icon */}
          {!isDone && !isFailed && (
            <div className="absolute inset-0 rounded-2xl bg-brand-500/10 animate-glow-pulse" />
          )}
          <div
            className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
              isDone
                ? 'bg-emerald-500/12'
                : isFailed
                  ? 'bg-red-500/12'
                  : 'bg-brand-500/12'
            }`}
          >
            {isDone ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            ) : isFailed ? (
              <AlertCircle className="w-7 h-7 text-red-400" />
            ) : (
              <Sparkles className="w-7 h-7 text-brand-400 animate-pulse-subtle" />
            )}
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-surface-50 tracking-tighter mb-2">
          {isDone ? 'Analizė baigta!' : isFailed ? 'Klaida' : 'Analizuojama...'}
        </h2>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-800/40 border border-white/[0.04]">
          <Clock className="w-3 h-3 text-surface-500" />
          <span className="text-[13px] font-mono text-surface-400">{formatTime(elapsedSec)}</span>
        </div>
      </div>

      {/* ── Pipeline Steps ────────────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="space-y-0">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === steps.length - 1;

            return (
              <div key={i} className="flex gap-4">
                {/* Vertical timeline */}
                <div className="flex flex-col items-center">
                  {/* Node */}
                  <div
                    className={`relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                               transition-all duration-500 ${
                      step.status === 'done'
                        ? 'bg-emerald-500/12 ring-1 ring-emerald-500/15'
                        : step.status === 'active'
                          ? 'bg-brand-500/12 ring-1 ring-brand-500/20'
                          : step.status === 'error'
                            ? 'bg-red-500/12 ring-1 ring-red-500/15'
                            : 'bg-surface-700/30'
                    }`}
                  >
                    {step.status === 'done' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : step.status === 'active' ? (
                      <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                    ) : step.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <Icon className="w-4 h-4 text-surface-600" />
                    )}
                  </div>

                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={`w-[1.5px] flex-1 my-1 rounded-full transition-colors duration-500 ${
                        step.status === 'done' ? 'bg-emerald-500/20' : 'bg-surface-700/30'
                      }`}
                      style={{ minHeight: '20px' }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-5 ${isLast ? 'pb-0' : ''}`}>
                  <p
                    className={`text-[14px] font-semibold tracking-tight transition-colors duration-300 ${
                      step.status === 'done'
                        ? 'text-emerald-300'
                        : step.status === 'active'
                          ? 'text-surface-100'
                          : step.status === 'error'
                            ? 'text-red-300'
                            : 'text-surface-600'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[12px] text-surface-500 mt-0.5">
                    {step.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Event Log ─────────────────────────────────────────── */}
      {fileEvents.length > 0 && (
        <div className="mt-4 glass-card p-4 animate-fade-in">
          <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider mb-2.5">
            Progresas
          </p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {fileEvents.slice(-8).map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-surface-500">
                <CheckCircle2 className="w-3 h-3 text-emerald-500/60 flex-shrink-0" />
                <span className="truncate">
                  {e.data.event_type === 'file_parsed'
                    ? `Parsavimas: ${e.data.filename || 'failas'}`
                    : e.data.event_type === 'extraction_completed'
                      ? `Ištrauka: ${e.data.filename || 'dokumentas'}`
                      : e.data.event_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
