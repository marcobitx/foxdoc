// frontend/src/components/SettingsView.tsx
// Settings page — model selection, token usage, shortcuts, system info
// Full-width layout with logical section hierarchy
// Related: api.ts (getSettings, updateSettings, getModels), modelStorage.ts

import { useEffect, useState } from 'react';
import {
  Cpu, Loader2,
  Zap, HardDrive, FileText, Users, Clock,
  ExternalLink, ChevronRight, ArrowUpRight, ArrowDownRight,
  DollarSign, Hash, Layers, Star,
} from 'lucide-react';
import { getSettings, updateSettings, getModels, getUsageStats, type Settings, type ModelInfo, type TokenUsageStats } from '../lib/api';
import { buildVisibleModels } from '../lib/modelStorage';
import { appStore, useStore, initModelStore } from '../lib/store';
import { ProviderLogo, getProvider, PROVIDER_COLORS } from './ProviderLogos';
import Tooltip from './Tooltip';
import { clsx } from 'clsx';

export default function SettingsView() {
  const storeState = useStore(appStore);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiModels, setApiModels] = useState<ModelInfo[]>([]);
  const [usage, setUsage] = useState<TokenUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDefault, setSavingDefault] = useState<string | null>(null);

  // Model list from store — reactive, synced with ModelPanel
  const customModels: ModelInfo[] = storeState.myCustomModels;
  const hiddenIds = new Set<string>(storeState.myHiddenIds);
  // myModels = same list as ModelPanel (API filtered by hidden + custom)
  const myModels = buildVisibleModels(apiModels, customModels, hiddenIds);

  // The currently selected default model's info
  const defaultModelInfo = myModels.find((m) => m.id === settings?.default_model);

  useEffect(() => {
    initModelStore();
    (async () => {
      try {
        const [s, m, u] = await Promise.all([getSettings(), getModels(), getUsageStats()]);
        setSettings(s);
        setApiModels(m);
        setUsage(u);
        appStore.setState({ cachedModels: m });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Set a model as default immediately (click on star)
  const setAsDefault = async (modelId: string) => {
    if (modelId === settings?.default_model) return;
    setSavingDefault(modelId);
    try {
      const result = await updateSettings({ default_model: modelId });
      setSettings(result);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingDefault(null);
    }
  };

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-brand-500" />
            <h2 className="text-[13px] font-bold text-surface-400 uppercase tracking-widest">
              Numatytasis modelis
            </h2>
          </div>
          <button
            onClick={() => appStore.setState({ modelPanelOpen: true })}
            className="text-[11px] font-semibold text-brand-500 hover:text-brand-400 transition-colors flex items-center gap-1"
          >
            Tvarkyti modelius
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          {/* Model list — mirrors ModelPanel */}
          <div className="grid gap-2 content-start">
            {myModels.map((model) => {
              const isDefault = settings?.default_model === model.id;
              const isSaving = savingDefault === model.id;
              const provider = getProvider(model.id);
              const brandColor = PROVIDER_COLORS[provider] || '#8d8076';

              return (
                <button
                  key={model.id}
                  onClick={() => setAsDefault(model.id)}
                  className={clsx(
                    'group relative flex items-center gap-3 pr-3.5 pl-4 py-2.5 rounded-[10px] border transition-all duration-200 overflow-hidden text-left',
                    isDefault
                      ? 'bg-surface-800/60 border-brand-500/40'
                      : 'bg-surface-800/50 border-surface-600/30 hover:border-surface-500/50 hover:bg-surface-700/60',
                  )}
                >
                  {/* Left accent bar */}
                  <div
                    className={clsx(
                      'absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[10px] transition-all duration-200',
                      isDefault ? 'opacity-100' : 'opacity-0',
                    )}
                    style={{ backgroundColor: brandColor }}
                  />

                  <ProviderLogo modelId={model.id} size={20} />

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white truncate">{model.name}</p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] uppercase tracking-tighter text-surface-500 font-bold">Ctx</span>
                      <span className="text-[10px] font-mono text-surface-300">{Math.round(model.context_length / 1000)}k</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] uppercase tracking-tighter text-surface-500 font-bold leading-none mb-0.5">In / 1M</span>
                      <span className="text-[10px] font-mono text-surface-300">${model.pricing_prompt.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] uppercase tracking-tighter text-surface-500 font-bold leading-none mb-0.5">Out / 1M</span>
                      <span className="text-[10px] font-mono text-surface-300">${model.pricing_completion.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Default indicator / set as default */}
                  <div className="flex-shrink-0">
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
                    ) : (
                      <Star className={clsx(
                        'w-3.5 h-3.5 transition-all duration-200',
                        isDefault
                          ? 'text-brand-400 fill-current'
                          : 'text-surface-600 opacity-0 group-hover:opacity-100',
                      )} />
                    )}
                  </div>
                </button>
              );
            })}

            {myModels.length === 0 && (
              <div className="enterprise-card p-6 text-center">
                <p className="text-[12px] text-surface-500 mb-2">Nėra modelių sąraše</p>
                <button
                  onClick={() => appStore.setState({ modelPanelOpen: true })}
                  className="text-[11px] font-semibold text-brand-500 hover:text-brand-400 transition-colors"
                >
                  Pridėti modelį
                </button>
              </div>
            )}
          </div>

          {/* Model Info Card — right side */}
          <div className="enterprise-card p-5 flex flex-col justify-between h-fit">
            <div>
              <h4 className="text-[12px] font-bold text-surface-400 uppercase tracking-widest mb-3">
                Modelio informacija
              </h4>

              {defaultModelInfo ? (
                <div className="space-y-3">
                  <InfoRow
                    icon={Cpu}
                    label="Modelis"
                    value={defaultModelInfo.name}
                  />
                  <InfoRow
                    icon={Zap}
                    label="Konteksto langas"
                    value={`${(defaultModelInfo.context_length / 1000).toFixed(0)}k tokenų`}
                  />
                  <InfoRow
                    icon={FileText}
                    label="Įvesties kaina"
                    value={`$${defaultModelInfo.pricing_prompt.toFixed(2)} / 1M`}
                  />
                  <InfoRow
                    icon={ChevronRight}
                    label="Išvesties kaina"
                    value={`$${defaultModelInfo.pricing_completion.toFixed(2)} / 1M`}
                  />
                </div>
              ) : (
                <p className="text-[12px] text-surface-500">
                  Pasirinkite numatytąjį modelį
                </p>
              )}
            </div>

            <a
              href="https://openrouter.ai/models"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-brand-500 hover:text-brand-400 transition-colors"
            >
              Visi modeliai
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Section: Token Usage ─────────────────────────────────── */}
      {usage && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-emerald-500" />
            <h2 className="text-[13px] font-bold text-surface-400 uppercase tracking-widest">
              Tokenų naudojimas
            </h2>
            <span className="text-[10px] text-surface-600 font-medium ml-1">(visa istorija)</span>
          </div>

          {/* Top stats row */}
          <div className="enterprise-card p-0 overflow-hidden mb-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-surface-700/30">
              <StatCell
                icon={Hash}
                label="Viso tokenų"
                value={formatTokens(usage.total_tokens)}
                tooltip="Bendras sunaudotų tokenų skaičius"
              />
              <StatCell
                icon={DollarSign}
                label="Apytikslė kaina"
                value={`$${usage.total_cost_usd.toFixed(4)}`}
                tooltip="Apytikslė bendra kaina pagal modelio kainas"
              />
              <StatCell
                icon={Layers}
                label="Analizės"
                value={String(usage.total_analyses)}
                tooltip="Atliktų analizių skaičius"
              />
              <StatCell
                icon={FileText}
                label="Failai / Puslapiai"
                value={`${usage.total_files_processed} / ${usage.total_pages_processed}`}
                tooltip="Apdorotų failų ir puslapių skaičius"
              />
            </div>
          </div>

          {/* Phase breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <PhaseCard
              label="Ekstrahavimas"
              input={usage.by_phase.extraction.input}
              output={usage.by_phase.extraction.output}
              totalTokens={usage.total_tokens}
            />
            <PhaseCard
              label="Agregavimas"
              input={usage.by_phase.aggregation.input}
              output={usage.by_phase.aggregation.output}
              totalTokens={usage.total_tokens}
            />
            <PhaseCard
              label="Vertinimas"
              input={usage.by_phase.evaluation.input}
              output={usage.by_phase.evaluation.output}
              totalTokens={usage.total_tokens}
            />
          </div>
        </section>
      )}

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
      <span className="text-[12px] font-mono font-medium text-surface-200 truncate ml-2 text-right">{value}</span>
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
