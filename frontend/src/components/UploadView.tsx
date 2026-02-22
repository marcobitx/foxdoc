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
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
            <span style={{ background: 'linear-gradient(135deg, #fcd34d, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>fox</span>
            <span className="text-surface-100">Doc</span>
          </span>{' '}pasiruošęs suuosti visas rizikas jūsų dokumentuose.
        </p>
      </div>

      {/* ── Feature Cards ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
        <FeatureCard
          step="01"
          desc="Įkelk dokumentus"
          image="/story1-upload.png"
        />
        <FeatureCard
          step="02"
          desc="Fox analizuoja"
          image="/story2-analyze.png"
        />
        <FeatureCard
          step="03"
          desc="Gauk rezultatą"
          image="/story3-result.png"
        />
      </div>

      <div className="mt-16">
        <ModelCarousel />
      </div>
    </div>
  );
}

function FeatureCard({ step, desc, image }: { step: string; desc: string; image: string }) {
  return (
    <div className="group relative flex flex-col h-[180px] rounded-xl overflow-hidden bg-[#0d0d0d] border border-white/[0.06] hover:border-[#f59e0b]/20 transition-all duration-500 cursor-default">
      {/* Background Image */}
      <img
        src={image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.03]"
      />

      {/* Bottom gradient for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      {/* Orange glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_bottom,rgba(245,158,11,0.07),transparent_70%)]" />

      {/* Content */}
      <div className="relative z-10 mt-auto p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-3 h-px bg-[#f59e0b]/50" />
          <span className="text-[9px] font-semibold text-[#f59e0b]/60 uppercase tracking-[0.25em]">{step}</span>
        </div>
        <p className="text-[13px] font-semibold text-white/80 tracking-[-0.01em]">{desc}</p>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[#f59e0b]/0 group-hover:bg-[#f59e0b]/30 transition-all duration-500" />
    </div>
  );
}
