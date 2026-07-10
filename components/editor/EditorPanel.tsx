/**
 * EditorPanel — The Monaco code editor with an action bar.
 *
 * Receives the `onMount` callback from the Yjs sync hook so the
 * editor instance can be wired into the collaborative document.
 */

'use client';

import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface EditorPanelProps {
  isExecuting: boolean;
  isAiOpen: boolean;
  onRunCode: () => void;
  onToggleAi: () => void;
  onEditorMount: (instance: editor.IStandaloneCodeEditor) => void;
}

export default function EditorPanel({
  isExecuting,
  isAiOpen,
  onRunCode,
  onToggleAi,
  onEditorMount,
}: EditorPanelProps) {
  return (
    <div className="flex flex-col h-full w-full gap-2 overflow-hidden">
      {/* Action Bar */}
      <div className="shrink-0 flex justify-between items-center bg-slate-900 p-2 rounded-md border border-slate-700">
        <span className="text-sm text-slate-400 ml-2 font-mono">main.cpp</span>

        <div className="flex items-center gap-2">
          {/* AI Assistant Toggle */}
          <button
            onClick={onToggleAi}
            className={`
              px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-1.5
              ${
                isAiOpen
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-violet-300 border border-slate-600'
              }
            `}
          >
            <span className="text-base">✨</span>
            AI Assistant
          </button>

          {/* Run Code */}
          <button
            onClick={onRunCode}
            disabled={isExecuting}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isExecuting ? 'Running...' : '▶ Run Code'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 rounded-md overflow-hidden border border-slate-800 relative">
        <Editor
          height="100%"
          defaultLanguage="cpp"
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            padding: { top: 16 },
            fontSize: 14,
          }}
          onMount={onEditorMount}
        />
      </div>
    </div>
  );
}
