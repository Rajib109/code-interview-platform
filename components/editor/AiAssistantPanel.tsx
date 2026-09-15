/**
 * AiAssistantPanel — Collapsible side panel for AI-powered coding assistance.
 *
 * Provides three hint modes (general, edge_case, complexity) and displays
 * structured AI responses in a chat-style interface.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { getAiHint, type HintResponse } from '@/lib/api/execution';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  requestType?: string;
  content: string;
  hint?: HintResponse;
  timestamp: Date;
}

interface AiAssistantPanelProps {
  isOpen: boolean;
  getCurrentCode: () => string;
  problemDescription: string;
}

// ---------------------------------------------------------------------------
// Hint mode config
// ---------------------------------------------------------------------------

const HINT_MODES = [
  { id: 'general' as const, icon: '💡', label: 'Hint' },
  { id: 'edge_case' as const, icon: '🔍', label: 'Edge Cases' },
  { id: 'complexity' as const, icon: '📊', label: 'Complexity' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AiAssistantPanel({
  isOpen,
  getCurrentCode,
  problemDescription,
}: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleRequest = async (requestType: 'general' | 'edge_case' | 'complexity') => {
    if (isLoading) return;

    const modeLabel = HINT_MODES.find((m) => m.id === requestType)?.label ?? requestType;

    // Add user message
    const userMsg: AiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      requestType,
      content: `Requesting: ${modeLabel}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Obtenemos el código actual mediante callback para evitar leer la referencia durante el renderizado
      const code = getCurrentCode();
      const hint = await getAiHint(problemDescription, code, requestType);

      const assistantMsg: AiMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: hint.message,
        hint,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: AiMessage = {
        id: crypto.randomUUID(),
        role: 'error',
        content: err instanceof Error ? err.message : 'Failed to reach the AI engine.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`
        flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out
        border-l border-slate-800 bg-slate-950/95 backdrop-blur-xl
        ${isOpen ? 'w-[340px] opacity-100' : 'w-0 opacity-0 border-l-0'}
      `}
    >
      {isOpen && (
        <>
          {/* Header */}
          <div className="shrink-0 px-4 py-3 border-b border-slate-800 bg-linear-to-r from-violet-950/50 to-slate-900">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h3 className="text-sm font-semibold text-slate-100">AI Assistant</h3>
              <span className="ml-auto text-[10px] font-mono text-violet-400/70 bg-violet-500/10 px-1.5 py-0.5 rounded">
                Gemini 2.5
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 px-3 py-3 border-b border-slate-800/60 flex gap-1.5">
            {HINT_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleRequest(mode.id)}
                disabled={isLoading}
                className="
                  flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg
                  text-xs font-medium transition-all duration-200
                  bg-slate-800/60 text-slate-300 border border-slate-700/50
                  hover:bg-violet-900/30 hover:text-violet-200 hover:border-violet-600/40
                  disabled:opacity-40 disabled:cursor-not-allowed
                  active:scale-95
                "
              >
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3 opacity-60">
                <div className="text-3xl">🧠</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Get Socratic hints, edge-case analysis, or complexity breakdowns for
                  your current code. Click a button above to start.
                </p>
              </div>
            )}

            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-violet-600/20 border border-violet-500/20 rounded-lg px-3 py-2 max-w-[90%]">
                      <p className="text-xs text-violet-300 font-medium">{msg.content}</p>
                    </div>
                  </div>
                );
              }

              if (msg.role === 'error') {
                return (
                  <div key={msg.id} className="bg-red-950/30 border border-red-800/30 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-400">⚠️ {msg.content}</p>
                  </div>
                );
              }

              // Assistant message
              return (
                <div key={msg.id} className="space-y-2">
                  {/* Hint type badge */}
                  {msg.hint && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                        {msg.hint.hintType}
                      </span>
                    </div>
                  )}

                  {/* Message body */}
                  <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg px-3 py-3">
                    <p className="text-sm text-slate-200 leading-relaxed">{msg.content}</p>
                  </div>

                  {/* Complexity card */}
                  {msg.hint?.estimatedComplexity && (
                    <div className="bg-slate-900/80 border border-slate-700/30 rounded-lg px-3 py-2 flex gap-4">
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                          Current
                        </p>
                        <p className="text-xs font-mono text-amber-400">
                          {msg.hint.estimatedComplexity.current}
                        </p>
                      </div>
                      <div className="w-px bg-slate-700/50" />
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                          Target
                        </p>
                        <p className="text-xs font-mono text-emerald-400">
                          {msg.hint.estimatedComplexity.target}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-slate-500">Thinking...</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-3 py-2 border-t border-slate-800/60">
            <p className="text-[10px] text-slate-600 text-center">
              Hints are Socratic — no solutions, just guidance.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
