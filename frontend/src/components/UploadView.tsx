// frontend/src/components/UploadView.tsx
// File upload view — drag & drop zone with animated border, file list, submit
// Entry point of the analysis workflow; uploads files to backend
// Related: api.ts, App.tsx

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Zap, Loader2, FileText, Archive, Image, Table2 } from 'lucide-react';
import { createAnalysis } from '../lib/api';

const ACCEPTED = '.pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.zip';
const MAX_SIZE_MB = 50;

interface Props {
  onStarted: (id: string) => void;
}

const FILE_ICONS: Record<string, { icon: any; color: string }> = {
  pdf: { icon: FileText, color: 'text-red-400' },
  docx: { icon: FileText, color: 'text-blue-400' },
  xlsx: { icon: Table2, color: 'text-emerald-400' },
  pptx: { icon: FileText, color: 'text-orange-400' },
  zip: { icon: Archive, color: 'text-amber-400' },
  png: { icon: Image, color: 'text-violet-400' },
  jpg: { icon: Image, color: 'text-violet-400' },
  jpeg: { icon: Image, color: 'text-violet-400' },
};

function getFileInfo(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || { icon: FileText, color: 'text-surface-400' };
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadView({ onStarted }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    const valid = arr.filter((f) => {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`${f.name} per didelis (maks. ${MAX_SIZE_MB}MB)`);
        return false;
      }
      return true;
    });
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !names.has(f.name))];
    });
    if (valid.length) setError(null);
  }, []);

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleSubmit = async () => {
    if (!files.length || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const result = await createAnalysis(files);
      onStarted(result.id);
    } catch (e: any) {
      setError(e.message || 'Nepavyko įkelti failų');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/8 border border-brand-500/12 mb-5">
          <Zap className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-[12px] font-semibold text-brand-300 tracking-tight">
            AI dokumentų analizė
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-surface-50 tracking-tighter leading-[1.1] mb-3">
          Viešųjų pirkimų
          <br />
          <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
            analizatorius
          </span>
        </h1>

        <p className="text-surface-400 text-[15px] leading-relaxed max-w-md mx-auto">
          Įkelkite pirkimo dokumentus — AI sistema juos išanalizuos
          ir pateiks struktūrizuotą ataskaitą per kelias minutes.
        </p>
      </div>

      {/* ── Drop Zone ─────────────────────────────────────────── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-2xl cursor-pointer transition-all duration-300 ease-out-expo ${
          dragOver ? 'scale-[1.01]' : ''
        }`}
      >
        {/* Animated border */}
        <div
          className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
            dragOver ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            padding: '1.5px',
            background: 'linear-gradient(135deg, #8b5cf6, #ff8c0a, #8b5cf6)',
            backgroundSize: '200% 200%',
            animation: 'borderFlow 2s linear infinite',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />

        <div
          className={`glass-card p-10 md:p-14 text-center transition-colors duration-300 ${
            dragOver ? 'bg-brand-500/5' : ''
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            onChange={(e) => e.target.files && addFiles(e.target.files)}
            className="hidden"
          />

          <div
            className={`w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              dragOver
                ? 'bg-brand-500/15 scale-110'
                : 'bg-surface-700/40'
            }`}
          >
            <Upload
              className={`w-6 h-6 transition-colors duration-300 ${
                dragOver ? 'text-brand-400' : 'text-surface-500'
              }`}
            />
          </div>

          <p className="text-[15px] font-semibold text-surface-200 mb-1.5 tracking-tight">
            {dragOver ? 'Paleiskite failus čia' : 'Nutempkite failus arba paspauskite'}
          </p>
          <p className="text-[12px] text-surface-500">
            PDF, DOCX, XLSX, PPTX, PNG, JPG, ZIP · Maks. {MAX_SIZE_MB}MB · Iki 20 failų
          </p>
        </div>
      </div>

      {/* ── File List ─────────────────────────────────────────── */}
      {files.length > 0 && (
        <div className="mt-5 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-surface-300 tracking-tight">
              {files.length} {files.length === 1 ? 'failas' : files.length < 10 ? 'failai' : 'failų'}
            </span>
            <button
              onClick={() => setFiles([])}
              className="text-[12px] text-surface-500 hover:text-surface-300 font-medium transition-colors"
            >
              Išvalyti
            </button>
          </div>

          <div className="space-y-1.5">
            {files.map((f, i) => {
              const info = getFileInfo(f.name);
              const FileIcon = info.icon;
              return (
                <div
                  key={f.name}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-800/30 border border-white/[0.04]
                             hover:bg-surface-800/50 transition-colors duration-200 animate-stagger"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <FileIcon className={`w-4 h-4 flex-shrink-0 ${info.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-surface-200 font-medium truncate">{f.name}</p>
                    <p className="text-[11px] text-surface-500 font-mono">{formatSize(f.size)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                    className="p-1.5 rounded-lg text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/15 text-[13px] text-red-300 animate-fade-in">
          {error}
        </div>
      )}

      {/* ── Submit ────────────────────────────────────────────── */}
      {files.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="btn-primary w-full mt-6 flex items-center justify-center gap-2.5 py-3 text-[15px] animate-fade-in-up"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Įkeliama...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Pradėti analizę</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
