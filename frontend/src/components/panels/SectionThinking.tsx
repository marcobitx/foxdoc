// frontend/src/components/panels/SectionThinking.tsx
// Thinking budget slider — off / low / medium / high
// Compact card in the right panel, controls LLM reasoning depth
// Related: store.ts, api.ts

import { Brain } from 'lucide-react';
import { appStore, useStore } from '../../lib/store';
import { clsx } from 'clsx';
import Tooltip from '../Tooltip';

const LEVELS = [
  { id: 'off',    label: 'Off',    tokens: '0',    desc: 'Be mąstymo — greičiausias',  tooltip: 'Išjungtas mąstymas — greičiausias, mažiausia kaina' },
  { id: 'low',    label: 'Low',    tokens: '2k',   desc: 'Trumpas mąstymas',            tooltip: '2 000 tokenų mąstymui — geras balansas' },
  { id: 'medium', label: 'Med',    tokens: '5k',   desc: 'Vidutinis mąstymas',           tooltip: '5 000 tokenų mąstymui — gilesnis samprotavimas' },
  { id: 'high',   label: 'High',   tokens: '10k',  desc: 'Gilus mąstymas',               tooltip: '10 000 tokenų mąstymui — maksimalus tikslumas' },
] as const;

export default function SectionThinking() {
  const state = useStore(appStore);
  const current = state.selectedThinking || 'low';
  const currentIdx = LEVELS.findIndex((l) => l.id === current);
  const meta = LEVELS[currentIdx] || LEVELS[1];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    appStore.setState({ selectedThinking: LEVELS[idx].id });
  };

  return (
    <div className="p-4 bg-transparent">
      <div className="flex items-center justify-between mb-3">
        <Tooltip content="AI mąstymo gylis agregacijos fazėje — daugiau tokenų = tikslesni rezultatai, bet lėčiau. Duomenų ištraukimas visada be mąstymo." side="left">
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-brand-400" />
            <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-widest">Thinking</h3>
          </div>
        </Tooltip>
        <Tooltip content={meta.tooltip} side="left">
          <span className="text-[10px] font-mono text-surface-400">
            {meta.tokens} tokenų
          </span>
        </Tooltip>
      </div>

      {/* Slider */}
      <div className="px-1">
        <input
          type="range"
          min={0}
          max={3}
          step={1}
          value={currentIdx}
          onChange={handleChange}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-400 bg-surface-700/60
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-400 [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-surface-900 [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:hover:bg-brand-300 [&::-webkit-slider-thumb]:transition-colors"
        />

        {/* Labels */}
        <div className="flex justify-between mt-1.5 px-0.5">
          {LEVELS.map((level, idx) => (
            <Tooltip key={level.id} content={level.tooltip} side="left">
              <button
                onClick={() => appStore.setState({ selectedThinking: level.id })}
                className={clsx(
                  'text-[9px] font-bold uppercase tracking-wider transition-colors',
                  currentIdx === idx ? 'text-brand-400' : 'text-surface-600 hover:text-surface-400',
                )}
              >
                {level.label}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Description */}
      <p className="text-[10px] text-surface-500 mt-2.5 leading-snug px-0.5">
        {meta.desc}
      </p>
    </div>
  );
}
