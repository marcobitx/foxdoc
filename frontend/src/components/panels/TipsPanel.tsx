// frontend/src/components/panels/TipsPanel.tsx
// Context tips for views without document-specific content (history, settings)
// Shows helpful Lithuanian tips relevant to the current view
// Related: RightPanel.tsx

import { Lightbulb } from 'lucide-react';
import type { AppView } from '../../lib/store';

export default function TipsPanel({ view }: { view: AppView }) {
  const tips = view === 'history'
    ? [
      'Paspauskite ant analizės norėdami peržiūrėti pilną ataskaitą',
      'Filtruokite pagal statusą: eilėje, vykdoma, užbaigta',
      'Kiekviena analizė saugo ataskaitą, dokumentus ir pokalbio istoriją',
    ]
    : [
      'Pasirinkite AI modelį — jis bus naudojamas visoms analizėms ir pokalbiams',
      'Tokenų naudojimas rodo kiekvienos analizės kainą ir apimtį',
      'Palaikomi formatai: PDF, DOCX, XLSX, PPTX, PNG, JPG ir ZIP',
      'Maks. 20 failų vienu metu, kiekvienas iki 50 MB',
    ];

  return (
    <div className="flex-1 p-4 space-y-3 animate-fade-in">
      {tips.map((tip, i) => (
        <div
          key={i}
          className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-surface-800/20 border border-surface-700/50 animate-stagger"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Lightbulb className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" />
          <span className="text-[12px] text-surface-400 leading-relaxed font-medium">{tip}</span>
        </div>
      ))}
    </div>
  );
}
