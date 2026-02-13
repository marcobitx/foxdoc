// frontend/src/components/SettingsView.tsx
// Settings page — API key config and model selection
// Clean form layout with card-based sections
// Related: api.ts (getSettings, updateSettings, getModels)

import { useEffect, useState } from 'react';
import { Save, Key, Cpu, Loader2, CheckCircle2, Eye, EyeOff, Shield } from 'lucide-react';
import { getSettings, updateSettings, getModels, type Settings, type ModelInfo } from '../lib/api';

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, m] = await Promise.all([getSettings(), getModels()]);
        setSettings(s);
        setModels(m);
        setSelectedModel(s.default_model);
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
      if (apiKey) update.openrouter_api_key = apiKey;
      if (Object.keys(update).length) {
        const result = await updateSettings(update);
        setSettings(result);
        setApiKey('');
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
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
    <div className="max-w-xl mx-auto animate-fade-in-up">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-surface-50 tracking-tighter">Nustatymai</h1>
        <p className="text-[13px] text-surface-500 mt-1">Konfigūruokite API prieigą ir modelį</p>
      </div>

      <div className="space-y-5">
        {/* ── API Key ─────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-start gap-3.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-accent-500/10 flex items-center justify-center flex-shrink-0">
              <Key className="w-4 h-4 text-accent-400" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-surface-100 tracking-tight">
                OpenRouter API raktas
              </h3>
              <p className="text-[12px] text-surface-500 mt-0.5">
                {settings?.api_key_set
                  ? <>Nustatytas: <span className="font-mono text-surface-400">{settings.api_key_preview}</span></>
                  : 'Nenustatytas — reikalingas LLM funkcionalumui'}
              </p>
            </div>
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
              className="input-field w-full pr-11 font-mono text-[13px]"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-surface-500 hover:text-surface-300 transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {!settings?.api_key_set && (
            <div className="mt-3 flex items-start gap-2 text-[11px] text-amber-400/80">
              <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>API raktas saugomas tik jūsų serveryje ir niekada neperduodamas tretiesiems</span>
            </div>
          )}
        </div>

        {/* ── Model Selection ────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-start gap-3.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-surface-100 tracking-tight">
                Numatytasis modelis
              </h3>
              <p className="text-[12px] text-surface-500 mt-0.5">
                Dabartinis: <span className="font-mono text-surface-400">{settings?.default_model || '—'}</span>
              </p>
            </div>
          </div>

          {models.length > 0 ? (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="input-field w-full text-[13px] cursor-pointer"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({(m.context_length / 1000).toFixed(0)}k ctx)
                </option>
              ))}
            </select>
          ) : (
            <input
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              placeholder="anthropic/claude-sonnet-4"
              className="input-field w-full text-[13px] font-mono"
            />
          )}
        </div>

        {/* ── Save Button ────────────────────────────────────── */}
        <button
          onClick={handleSave}
          disabled={saving || (!apiKey && selectedModel === settings?.default_model)}
          className="btn-primary w-full flex items-center justify-center gap-2.5 py-3 text-[14px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saugoma...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Išsaugota!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Išsaugoti pakeitimus
            </>
          )}
        </button>
      </div>
    </div>
  );
}
