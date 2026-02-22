// frontend/src/components/UploadView.tsx
// Upload view — centered hero with title, features grid, and model carousel
// File upload handled via FilesPanel; this shows the landing page

import { FileText, ExternalLink } from 'lucide-react';
import { appStore, useStore } from '../lib/store';
import ModelCarousel from './ModelCarousel';
import Tooltip from './Tooltip';

export default function UploadView() {
  const state = useStore(appStore);

  return (
    <div className="w-full animate-fade-in-up">
      {/* ── Compact Header ──── */}
      <div className="text-center mb-10 pt-4 md:pt-6">
        <div className="flex items-center justify-center gap-3 mb-6">
          <a
            href="https://viesiejipirkimai.lt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-surface-700/30 hover:bg-white/[0.1] transition-all"
          >
            <img src="/cvpis-logo.png" alt="CVP IS" className="h-6 w-auto" />
            <ExternalLink className="w-3 h-3 text-surface-500" />
          </a>
          <div className="h-4 w-px bg-surface-700/40" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">AI paruošta</span>
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
          Analizė dabar <span className="text-brand-400">dar lengvesnė!</span>
        </h1>

        <p className="text-surface-400 text-base md:text-lg max-w-xl mx-auto font-medium">
          Mūsų lapė pasiruošusi suuosti visas rizikas jūsų dokumentuose.
        </p>
      </div>

      {/* ── High-Energy Fun Cards ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 animate-fade-in">
        <FeatureCard
          title="Vienas, du ir baigta!"
          desc="AI analizė už jus"
          image="https://images.unsplash.com/photo-1516934023934-897bd4eb9d14?auto=format&fit=crop&q=80&w=600"
          color="emerald"
        />
        <FeatureCard
          title="Saugu kaip landoje"
          desc="Privati sesija"
          image="https://images.unsplash.com/photo-1474511320721-9a6ee0738356?auto=format&fit=crop&q=80&w=600"
          color="brand"
        />
        <FeatureCard
          title="Laimingas finalas"
          desc="Visas žurnalas"
          image="https://images.unsplash.com/photo-1557008075-7f2c5efa4cfd?auto=format&fit=crop&q=80&w=600"
          color="violet"
        />
      </div>

      <div className="mt-16">
        <ModelCarousel />
      </div>
    </div>
  );
}

function FeatureCard({ title, desc, image, color }: { title: string; desc: string; image: string; color: string }) {
  const accentColor = color === 'emerald' ? '#10b981' : color === 'brand' ? '#f59e0b' : '#a78bfa';

  return (
    <div className="group relative flex flex-col h-[340px] rounded-[32px] overflow-hidden bg-surface-900 border-2 border-surface-800/50 hover:border-white/10 transition-all duration-500 hover:-translate-y-3">
      {/* Background Image - Clean & Vibrant */}
      <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />

      {/* Modern Gradient Overlay - Not too dark */}
      <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/20 to-transparent opacity-80" />

      {/* Content */}
      <div className="relative z-10 mt-auto p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 mb-4 shadow-xl">
          <span className="text-[11px] font-black text-white uppercase tracking-tighter">🦊 {desc}</span>
        </div>
        <h3 className="text-2xl font-black text-white leading-tight drop-shadow-lg">{title}</h3>
      </div>

      {/* Interactive Border Glow */}
      <div className="absolute inset-0 border-4 border-transparent group-hover:border-white/5 rounded-[32px] transition-all duration-500" />
      <div
        className="absolute bottom-0 left-0 right-0 h-2 opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
        style={{ backgroundColor: accentColor, boxShadow: `0 0 40px ${accentColor}44` }}
      />
    </div>
  );
}
