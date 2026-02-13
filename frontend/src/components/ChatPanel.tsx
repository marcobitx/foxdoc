// frontend/src/components/ChatPanel.tsx
// Slide-in chat panel — Q&A about completed analysis with streaming responses
// Fixed right panel with message history, suggested questions, and input
// Related: api.ts (streamChat, getChatHistory), ResultsView.tsx

import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, MessageSquare, Bot, User, Sparkles } from 'lucide-react';
import { streamChat, getChatHistory, type ChatMessage } from '../lib/api';

interface Props {
  analysisId: string;
  onClose: () => void;
}

const SUGGESTIONS = [
  'Kokios pagrindinės kvalifikacijos sąlygos?',
  'Apibūdink vertinimo kriterijus',
  'Kokie yra terminai?',
  'Ar yra kokių rizikų?',
];

export default function ChatPanel({ analysisId, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [currentChunks, setCurrentChunks] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        setMessages(await getChatHistory(analysisId));
      } catch { /* ignore */ }
    })();
  }, [analysisId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, currentChunks]);

  const handleSend = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || streaming) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q, timestamp: new Date().toISOString() }]);
    setStreaming(true);
    setCurrentChunks('');

    try {
      let full = '';
      for await (const chunk of streamChat(analysisId, q)) {
        full += chunk;
        setCurrentChunks(full);
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: full, timestamp: new Date().toISOString() },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ Klaida: ${e.message}`, timestamp: new Date().toISOString() },
      ]);
    } finally {
      setStreaming(false);
      setCurrentChunks('');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md z-50 flex flex-col
                    bg-surface-900/97 backdrop-blur-2xl border-l border-white/[0.05]
                    shadow-[-8px_0_40px_rgba(0,0,0,0.4)] animate-slide-in-right">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-white/[0.04] flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-accent-500/12 flex items-center justify-center">
          <MessageSquare className="w-3.5 h-3.5 text-accent-400" />
        </div>
        <span className="text-[14px] font-bold text-surface-100 flex-1 tracking-tight">
          Klausti apie analizę
        </span>
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-surface-700/40 text-surface-500 hover:text-surface-300 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Messages ──────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Empty state */}
        {messages.length === 0 && !streaming && (
          <div className="text-center py-10 animate-fade-in">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-brand-500/8 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-400" />
            </div>
            <p className="text-[14px] font-semibold text-surface-300 mb-1">AI Asistentas</p>
            <p className="text-[12px] text-surface-500 mb-6">
              Klauskite bet ką apie pirkimo dokumentus
            </p>
            <div className="space-y-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="block w-full text-left text-[12px] px-3.5 py-2.5 rounded-xl
                           bg-surface-800/30 border border-white/[0.04]
                           text-surface-400 hover:text-surface-200 hover:bg-surface-800/50
                           hover:border-white/[0.08] transition-all duration-200"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-brand-500/12 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-3 h-3 text-brand-400" />
              </div>
            )}
            <div
              className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent-500/12 text-surface-100 rounded-br-md'
                  : 'bg-surface-800/40 text-surface-200 rounded-bl-md border border-white/[0.03]'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-accent-500/12 flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-3 h-3 text-accent-400" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming bubble */}
        {streaming && currentChunks && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-brand-500/12 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-3 h-3 text-brand-400" />
            </div>
            <div className="max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-surface-800/40 text-[13px] text-surface-200 border border-white/[0.03]">
              <p className="whitespace-pre-wrap">{currentChunks}</p>
              <span className="inline-block w-[2px] h-4 bg-brand-400 animate-pulse ml-0.5 align-text-bottom" />
            </div>
          </div>
        )}

        {/* Loading dot */}
        {streaming && !currentChunks && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-brand-500/12 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3 h-3 text-brand-400" />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-surface-800/40 border border-white/[0.03]">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400/60 animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400/60 animate-pulse" style={{ animationDelay: '200ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400/60 animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Input ─────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-white/[0.04] flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Rašykite klausimą..."
            className="input-field flex-1 text-[13px]"
            disabled={streaming}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || streaming}
            className="btn-primary px-3.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
