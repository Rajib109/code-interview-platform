'use client';

import Editor from '@monaco-editor/react';
import { useRef, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import * as awarenessProtocol from 'y-protocols/awareness';
import type { editor } from 'monaco-editor';
import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Helper to generate a random hex color for the user's cursor
const getRandomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

interface CollaborativeEditorProps {
  roomId: string;
  userEmail: string;
}

export default function CollaborativeEditor({ roomId, userEmail }: CollaborativeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const supabase = createClient();

  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [stdinInput, setStdinInput] = useState<string>('');

  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe();
      bindingRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, []);

  function handleEditorDidMount(editorInstance: editor.IStandaloneCodeEditor) {
    editorRef.current = editorInstance;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const type = ydoc.getText('monaco');

    // --- 1. AWARENESS (CURSORS) SETUP ---
    const awareness = new awarenessProtocol.Awareness(ydoc);

    const displayName = userEmail.split('@')[0];

    // Set the local user's cursor metadata
    awareness.setLocalStateField('user', {
      name: displayName,
      color: getRandomColor()
    });

    bindingRef.current = new MonacoBinding(
      type,
      editorInstance.getModel()!,
      new Set([editorInstance]),
      awareness
    );

    const channel = supabase.channel(`room-${roomId}`);
    channelRef.current = channel;

    // --- 2. DOCUMENT SYNC & BOOTSTRAPPING ---

    // A. Broadcast local keystrokes
    ydoc.on('update', (update, origin) => {
      if (origin !== 'supabase') {
        channel.send({
          type: 'broadcast',
          event: 'yjs-update',
          payload: { update: Array.from(update) },
        });
      }
    });

    // B. Listen for incoming updates (both keystrokes and full state handshakes)
    channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
      const remoteUpdate = new Uint8Array(payload.update);
      Y.applyUpdate(ydoc, remoteUpdate, 'supabase');
    });

    // C. The Handshake: When someone asks for state, send our full local state
    channel.on('broadcast', { event: 'request-state' }, () => {
      const stateUpdate = Y.encodeStateAsUpdate(ydoc);
      channel.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { update: Array.from(stateUpdate) },
      });
    });


    // --- 3. CURSOR SYNC ---

    // A. Broadcast local cursor movements
    awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: string) => {
      if (origin !== 'supabase') {
        const changedClients = added.concat(updated, removed);
        const update = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients);
        channel.send({
          type: 'broadcast',
          event: 'awareness-update',
          payload: { update: Array.from(update) }
        });
      }
    });

    // B. Apply remote cursor movements
    channel.on('broadcast', { event: 'awareness-update' }, ({ payload }) => {
      const update = new Uint8Array(payload.update);
      awarenessProtocol.applyAwarenessUpdate(awareness, update, 'supabase');
    });

    // --- 4. CONNECTION INITIALIZATION ---
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // We just joined. Ask anyone currently in the room for the full document state.
        channel.send({
          type: 'broadcast',
          event: 'request-state',
        });
      }
    });
  }

  const handleRunCode = async () => {
    if (!editorRef.current) return;

    const code = editorRef.current.getValue();
    setIsExecuting(true);
    setOutput('Compiling and running...');

    try {
      const payload = stdinInput.trim()
        ? { code, stdin: stdinInput }
        : { code, problem_id: 'two-sum' };

      const response = await fetch('http://localhost:8000/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.results) {
        // Test-case mode: format pass/fail results
        const lines = data.results.map((r: { id: string; passed: boolean; input: string; expected: string; actual: string; error?: string }) => {
          const icon = r.passed ? '✅' : '❌';
          let line = `${icon} ${r.id}: ${r.passed ? 'PASSED' : 'FAILED'}`;
          if (!r.passed) {
            line += `\n   Input:    ${r.input?.trim()}\n   Expected: ${r.expected?.trim()}\n   Actual:   ${r.actual?.trim() || r.error || 'N/A'}`;
          }
          return line;
        });
        const summary = `\n\n━━━ ${data.passed_cases}/${data.total_cases} test cases passed ━━━`;
        setOutput(lines.join('\n\n') + summary);
      } else if (data.status === 'success') {
        setOutput(data.output || '(no output)');
      } else {
        setOutput(`Error: ${data.message}\n\n${data.output || data.details || ''}`);
      }
    } catch (error) {
      setOutput('Failed to connect to the execution engine. Is it running?');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full gap-2 overflow-hidden">
      {/* Action Bar */}
      <div className="flex-shrink-0 flex justify-between items-center bg-slate-900 p-2 rounded-md border border-slate-700">
        <span className="text-sm text-slate-400 ml-2 font-mono">main.cpp</span>
        <button
          onClick={handleRunCode}
          disabled={isExecuting}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2"
        >
          {isExecuting ? 'Running...' : '▶ Run Code'}
        </button>
      </div>

      {/* Editor Space — min-h-0 is critical for flex children to actually shrink */}
      <div className="flex-1 min-h-0 rounded-md overflow-hidden border border-slate-800">
        <Editor
          height="100%"
          defaultLanguage="cpp"
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            padding: { top: 16 },
            fontSize: 14,
          }}
          onMount={handleEditorDidMount}
        />
      </div>

      {/* Bottom Panel: Input + Output side-by-side — flex-shrink-0 so it never gets pushed off-screen */}
      <div className="flex-shrink-0 flex gap-2" style={{ height: '180px' }}>
        {/* Custom Input */}
        <div className="flex-1 bg-black rounded-md border border-slate-800 flex flex-col overflow-hidden">
          <div className="bg-slate-900 px-4 py-1.5 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
            Custom Input (stdin)
          </div>
          <textarea
            value={stdinInput}
            onChange={(e) => setStdinInput(e.target.value)}
            placeholder={'Enter input here, e.g.:\n4\n2 7 11 15\n9'}
            className="flex-1 w-full bg-transparent p-3 font-mono text-sm text-slate-300 resize-none outline-none placeholder-slate-600"
            spellCheck={false}
          />
        </div>

        {/* Output Console */}
        <div className="flex-1 bg-black rounded-md border border-slate-800 flex flex-col overflow-hidden">
          <div className="bg-slate-900 px-4 py-1.5 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
            Terminal Output
          </div>
          <div className="flex-1 p-3 overflow-y-auto font-mono text-sm text-slate-300 whitespace-pre-wrap">
            {output || 'Click "Run Code" to see output here.'}
          </div>
        </div>
      </div>
    </div>
  );
}