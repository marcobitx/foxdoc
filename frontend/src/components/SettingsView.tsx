// frontend/src/components/SettingsView.tsx
// Settings page — model selection, token usage, shortcuts, system info
// Full-width layout with logical section hierarchy
// Related: api.ts (getSettings, updateSettings, getModels), modelStorage.ts

import { useEffect, useState } from 'react';
import {
  Save, Cpu, Loader2, CheckCircle2,
  Zap, HardDrive, FileText, Users, Clock,
  ExternalLink, ChevronRight, ArrowUpRight, ArrowDownRight,
  DollarSign, Hash, Layers, Star, RotateCcw,
} from 'lucide-react';
import { getSettings, updateSettings, getModels, getUsageStats, resetUsageStats, type Settings, type ModelInfo, type TokenUsageStats } from '../lib/api';
import { buildVisibleModels } from '../lib/modelStorage';
import { appStore, useStore, initModelStore } from '../lib/store';
import { ProviderLogo } from './ProviderLogos';
import CustomSelect from './CustomSelect';
import Tooltip from './Tooltip';
import { clsx } from 'clsx';

export default function SettingsView() {
  const storeState = useStore(appStore);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [usage, setUsage] = useState<TokenUsageStats | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resettingUsage, setResettingUsage] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [savingDefault, setSavingDefault] = useState<string | null>(null);

  // Model list from store — reactive, synced with ModelPanel (single source of truth)
  const apiModels: ModelInfo[] = storeState.cachedModels ?? [];
  const customModels: ModelInfo[] = storeState.myCustomModels;
  const hiddenIds = new Set<string>(storeState.myHiddenIds);
  const myModels = buildVisibleModels(apiModels, customModels, hiddenIds);

  useEffect(() => {
    initModelStore();
    (async () => {
      try {
        const [s, m, u] = await Promise.all([getSettings(), getModels(), getUsageStats()]);
        setSettings(s);
        setUsage(u);
        appStore.setState({ cachedModels: m, defaultModelId: s.default_model });

        // Set dropdown value — use saved default, fall back to first visible model
        const visible = buildVisibleModels(m, storeState.myCustomModels, new Set(storeState.myHiddenIds));
        const defaultId = s.default_model;
        const hasMatch = defaultId && visible.some((v: ModelInfo) => v.id === defaultId);
        setSelectedModel(hasMatch ? defaultId : (visible[0]?.id ?? ''));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const update: any = {};
      if (selectedModel && selectedModel !== settings?.default_model) update.default_model = selectedModel;
      if (Object.keys(update).length) {
        const result = await updateSettings(update);
        setSettings(result);
        appStore.setState({ defaultModelId: result.default_model });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  // Set a model as default immediately (from the model list)
  const setAsDefault = async (modelId: string) => {
    if (modelId === settings?.default_model) return;
    setSavingDefault(modelId);
    try {
      const result = await updateSettings({ default_model: modelId });
      setSettings(result);
      setSelectedModel(modelId);
      appStore.setState({ defaultModelId: modelId });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingDefault(null);
    }
  };


  const hasChanges = selectedModel && selectedModel !== settings?.default_model;
  const selectedModelInfo = myModels.find((m) => m.id === selectedModel);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in-up">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Nustatymai</h1>
        <p className="text-[12px] text-surface-500 mt-1 font-bold uppercase tracking-widest">
          Modelio pasirinkimas, tokenų naudojimas ir sistemos parametrai
        </p>
      </div>

      {/* ── Section: Model Configuration ─────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full bg-brand-500" />
          <h2 className="text-[13px] font-bold text-surface-400 uppercase tracking-widest">
            Modelio konfigūracija
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Model Selector — 2/3 width */}
          <div className="lg:col-span-2 enterprise-card p-5">
            <div className="flex items-start gap-3 mb-4">
              <Cpu className="w-4.5 h-4.5 text-brand-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-bold text-surface-100 tracking-tight">
                  Numatytasis modelis
                </h3>
                <p className="text-[11px] text-surface-500 mt-0.5 font-medium">
                  Naudojamas dokumentų analizei ir pokalbio atsakymams
                </p>
              </div>
              {/* Save button — inline */}
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={clsx(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 flex-shrink-0',
                  hasChanges
                    ? 'bg-brand-500 hover:bg-brand-400 text-surface-950 shadow-sm shadow-brand-500/20'
                    : saved
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'bg-surface-800/50 text-surface-500 cursor-not-allowed',
                )}
              >
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saugoma...</>
                ) : saved ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Išsaugota</>
                ) : (
                  <><Save className="w-3.5 h-3.5" /> Išsaugoti</>
                )}
              </button>
            </div>

            {myModels.length > 0 ? (
              <CustomSelect
                value={selectedModel}
                onChange={setSelectedModel}
                options={myModels.map((m) => ({
                  value: m.id,
                  label: `${m.name} (${(m.context_length / 1000).toFixed(0)}k ctx)`,
                }))}
                className="text-[13px]"
              />
            ) : (
              <input
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                placeholder="anthropic/claude-sonnet-4"
                className="input-field w-full text-[13px] font-mono"
              />
            )}

            {/* Currently active indicator */}
            <div className="flex items-center gap-2 mt-3">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              <span className="text-[11px] font-medium text-surface-500">
                Aktyvus: <span className="text-brand-400 font-mono">{settings?.default_model ? settings.default_model.split('/').pop() : '—'}</span>
              </span>
            </div>
          </div>

          {/* Model Info Card — 1/3 width */}
          <div className="enterprise-card p-5 flex flex-col justify-between">
            <div>
              <h4 className="text-[12px] font-bold text-surface-400 uppercase tracking-widest mb-3">
                Modelio informacija
              </h4>

              {selectedModelInfo ? (
                <div className="space-y-3">
                  <Tooltip content="Maksimalus teksto kiekis, kurį modelis gali apdoroti vienu metu" side="left">
                    <InfoRow
                      icon={Zap}
                      label="Konteksto langas"
                      value={`${(selectedModelInfo.context_length / 1000).toFixed(0)}k tokenų`}
                    />
                  </Tooltip>
                  <Tooltip content="Kaina už 1 mln. įvesties tokenų" side="left">
                    <InfoRow
                      icon={FileText}
                      label="Įvesties kaina"
                      value={`$${selectedModelInfo.pricing_prompt.toFixed(2)} / 1M`}
                    />
                  </Tooltip>
                  <Tooltip content="Kaina už 1 mln. išvesties tokenų" side="left">
                    <InfoRow
                      icon={ChevronRight}
                      label="Išvesties kaina"
                      value={`$${selectedModelInfo.pricing_completion.toFixed(2)} / 1M`}
                    />
                  </Tooltip>
                </div>
              ) : (
                <p className="text-[12px] text-surface-500">
                  Pasirinkite modelį, kad pamatytumėte informaciją
                </p>
              )}
            </div>

            <Tooltip content="Atidaryti OpenRouter modelių sąrašą" side="left">
              <a
                href="https://openrouter.ai/models"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-brand-500 hover:text-brand-400 transition-colors"
              >
                Visi modeliai
                <ExternalLink className="w-3 h-3" />
              </a>
            </Tooltip>
          </div>
        </div>
      </section>

      {/* ── Section 3: Token Usage ─────────────────────────────────── */}
      {(() => {
        const u = usage ?? {
          total_tokens: 0, total_cost_usd: 0, total_analyses: 0,
          total_files_processed: 0, total_pages_processed: 0,
          by_phase: {
            extraction: { input: 0, output: 0 },
            aggregation: { input: 0, output: 0 },
            evaluation: { input: 0, output: 0 },
          },
        };
        return (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-emerald-500" />
            <h2 className="text-[13px] font-bold text-surface-400 uppercase tracking-widest">
              Tokenų naudojimas
            </h2>
            <span className="text-[10px] text-surface-600 font-medium ml-1">(visa istorija)</span>
            {!confirmReset ? (
              <Tooltip content="Išvalyti tokenų naudojimo istoriją" side="top">
                <button
                  onClick={() => setConfirmReset(true)}
                  disabled={resettingUsage}
                  className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={12} className={resettingUsage ? 'animate-spin' : ''} />
                  Reset
                </button>
              </Tooltip>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] text-surface-500">Tikrai išvalyti?</span>
                <button
                  onClick={async () => {
                    setConfirmReset(false);
                    setResettingUsage(true);
                    try {
                      await resetUsageStats();
                      setUsage(null);
                      const fresh = await getUsageStats();
                      setUsage(fresh);
                    } catch (e) {
                      console.error('Failed to reset usage stats', e);
                    } finally {
                      setResettingUsage(false);
                    }
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  Taip
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
                >
                  Ne
                </button>
              </div>
            )}
          </div>

          {/* Top stats row */}
          <div className="enterprise-card p-0 overflow-hidden mb-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-surface-700/30">
              <StatCell
                icon={Hash}
                label="Viso tokenų"
                value={formatTokens(u.total_tokens)}
                tooltip="Bendras sunaudotų tokenų skaičius"
              />
              <StatCell
                icon={DollarSign}
                label="Apytikslė kaina"
                value={`$${u.total_cost_usd.toFixed(4)}`}
                tooltip="Apytikslė bendra kaina pagal modelio kainas"
              />
              <StatCell
                icon={Layers}
                label="Analizės"
                value={String(u.total_analyses)}
                tooltip="Atliktų analizių skaičius"
              />
              <StatCell
                icon={FileText}
                label="Failai / Puslapiai"
                value={`${u.total_files_processed} / ${u.total_pages_processed}`}
                tooltip="Apdorotų failų ir puslapių skaičius"
              />
            </div>
          </div>

          {/* Phase breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <PhaseCard
              label="Ištraukimas"
              input={u.by_phase.extraction.input}
              output={u.by_phase.extraction.output}
              totalTokens={u.total_tokens}
            />
            <PhaseCard
              label="Agregavimas"
              input={u.by_phase.aggregation.input}
              output={u.by_phase.aggregation.output}
              totalTokens={u.total_tokens}
            />
            <PhaseCard
              label="Vertinimas"
              input={u.by_phase.evaluation.input}
              output={u.by_phase.evaluation.output}
              totalTokens={u.total_tokens}
            />
          </div>
        </section>
        );
      })()}

      {/* ── Section: System Limits ──────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full bg-surface-600" />
          <h2 className="text-[13px] font-bold text-surface-500 uppercase tracking-widest">
            Sistemos parametrai
          </h2>
          <span className="text-[10px] text-surface-600 font-medium ml-1">(tik skaitymas)</span>
        </div>

        <div className="enterprise-card p-0 overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-surface-700/30">
            <StatCell
              icon={HardDrive}
              label="Maks. failo dydis"
              value="50 MB"
              tooltip="Vieno failo maksimalus dydis"
            />
            <StatCell
              icon={FileText}
              label="Maks. failų skaičius"
              value="20"
              tooltip="Maksimalus failų skaičius vienai analizei"
            />
            <StatCell
              icon={Users}
              label="Lygiagrečios analizės"
              value="5"
              tooltip="Vienu metu apdorojamų dokumentų skaičius"
            />
            <StatCell
              icon={Clock}
              label="Dokumento laikas"
              value="120 s"
              tooltip="Maksimalus vieno dokumento apdorojimo laikas"
            />
          </div>
        </div>
      </section>

    </div>
  );
}

/* ── Helper Components ────────────────────────────────────────────── */

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-surface-500" />
        <span className="text-[12px] text-surface-400">{label}</span>
      </div>
      <span className="text-[12px] font-mono font-medium text-surface-200">{value}</span>
    </div>
  );
}

function StatCell({ icon: Icon, label, value, tooltip }: { icon: any; label: string; value: string; tooltip?: string }) {
  const cell = (
    <div className="p-4 text-center w-full">
      <Icon className="w-4 h-4 text-surface-500 mx-auto mb-2" />
      <p className="text-[15px] font-bold text-surface-200 mb-0.5">{value}</p>
      <p className="text-[10px] text-surface-500 font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
  if (!tooltip) return cell;
  return <Tooltip content={tooltip} side="top">{cell}</Tooltip>;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function PhaseCard({
  label,
  input,
  output,
  totalTokens,
}: {
  label: string;
  input: number;
  output: number;
  totalTokens: number;
}) {
  const phaseTotal = input + output;
  const pct = totalTokens > 0 ? ((phaseTotal / totalTokens) * 100).toFixed(1) : '0';

  return (
    <div className="enterprise-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[12px] font-bold text-surface-300 uppercase tracking-widest">
          {label}
        </h4>
        <span className="text-[11px] font-mono font-medium text-brand-400">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-surface-700/50 mb-3">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ArrowDownRight className="w-3 h-3 text-blue-400" />
            <span className="text-[11px] text-surface-500">Įvestis</span>
          </div>
          <span className="text-[12px] font-mono font-medium text-surface-300">{formatTokens(input)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3 h-3 text-amber-400" />
            <span className="text-[11px] text-surface-500">Išvestis</span>
          </div>
          <span className="text-[12px] font-mono font-medium text-surface-300">{formatTokens(output)}</span>
        </div>
      </div>
    </div>
  );
}
