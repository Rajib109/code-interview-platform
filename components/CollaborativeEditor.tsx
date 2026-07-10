'use client';

import Editor from '@monaco-editor/react';
import { useRef, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import * as awarenessProtocol from 'y-protocols/awareness';
import type { editor } from 'monaco-editor';
import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Panel, Group, Separator } from 'react-resizable-panels';

const PROBLEMS = {
  'two-sum': {
    id: 'two-sum',
    title: '1. Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    starterCode: `#include <iostream>\n#include <vector>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n        \n    }\n};\n`
  },
  'reverse-linked-list': {
    id: 'reverse-linked-list',
    title: '2. Reverse Linked List',
    description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
    starterCode: `#include <iostream>\n\nusing namespace std;\n\nstruct ListNode {\n    int val;\n    ListNode *next;\n    ListNode(int x) : val(x), next(NULL) {}\n};\n\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Write your code here\n        \n    }\n};\n`
  }
};

// --- UTILITIES ---

// Generate a random hex color for the user's cursor
const getRandomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

// Safe Browser Base64 encoding/decoding for Yjs binary state
const fromUint8ArrayToBase64 = (arr: Uint8Array) => {
  let binary = '';
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return window.btoa(binary);
};

const fromBase64ToUint8Array = (base64: string) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};

interface CollaborativeEditorProps {
  roomId: string;
  userEmail: string;
  isHost: boolean;
}

export default function CollaborativeEditor({ roomId, userEmail, isHost }: CollaborativeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [stdinInput, setStdinInput] = useState<string>('');
  const [activeProblemId, setActiveProblemId] = useState<string>('two-sum');

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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

    const ymap = ydoc.getMap('metadata');

    ymap.observe(() => {
      const syncedProblem = ymap.get('active_problem') as string;
      if (syncedProblem && syncedProblem !== activeProblemId) {
        setActiveProblemId(syncedProblem);
      }
    });

    // --- 1. PERSISTENCE: FETCH INITIAL STATE ---
    supabase
      .from('rooms')
      .select('yjs_state')
      .eq('id', roomId)
      .single()
      .then(({ data }) => {
        if (data?.yjs_state) {
          const binaryState = fromBase64ToUint8Array(data.yjs_state);
          Y.applyUpdate(ydoc, binaryState);
        }
      }, (err) => console.error('Failed to fetch initial room state:', err));

    // --- 2. AWARENESS (CURSORS) SETUP ---
    const awareness = new awarenessProtocol.Awareness(ydoc);
    
    const displayName = userEmail.split('@')[0];


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

    // --- 3. DOCUMENT SYNC & BOOTSTRAPPING ---

    ydoc.on('update', (update, origin) => {
      // A. Broadcast local keystrokes via Supabase Realtime
      if (origin !== 'supabase') {
        channel.send({
          type: 'broadcast',
          event: 'yjs-update',
          payload: { update: Array.from(update) },
        });
      }

      // B. PERSISTENCE: Debounced Save to Database
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const state = Y.encodeStateAsUpdate(ydoc);
          const base64State = fromUint8ArrayToBase64(state);
          
          await supabase
            .from('rooms')
            .update({ yjs_state: base64State })
            .eq('id', roomId);
        } catch (err) {
          console.error('Failed to persist state:', err);
        }
      }, 2000); // 2-second debounce
    });

    // Listen for incoming document updates
    channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
      const remoteUpdate = new Uint8Array(payload.update);
      Y.applyUpdate(ydoc, remoteUpdate, 'supabase');
    });

    // The Handshake: When someone asks for state, send full local state
    channel.on('broadcast', { event: 'request-state' }, () => {
      const stateUpdate = Y.encodeStateAsUpdate(ydoc);
      channel.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { update: Array.from(stateUpdate) },
      });
    });

    // --- 4. CURSOR SYNC ---

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

    channel.on('broadcast', { event: 'awareness-update' }, ({ payload }) => {
      const update = new Uint8Array(payload.update);
      awarenessProtocol.applyAwarenessUpdate(awareness, update, 'supabase');
    });

    // --- 5. CONNECTION INITIALIZATION ---
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'request-state',
        });
      }
    });
  }

  const handleProblemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isHost || !ydocRef.current) return;
    
    const newProblemId = e.target.value;
    const problem = PROBLEMS[newProblemId as keyof typeof PROBLEMS];
    
    // 1. Update the shared metadata (syncs to candidate instantly)
    const ymap = ydocRef.current.getMap('metadata');
    ymap.set('active_problem', newProblemId);
    setActiveProblemId(newProblemId);

    // 2. Clear the editor and insert the new C++ starter code
    const ytext = ydocRef.current.getText('monaco');
    ytext.delete(0, ytext.length);
    ytext.insert(0, problem.starterCode);
  };

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
    <div className="flex-1 h-full w-full overflow-hidden bg-black text-slate-300 flex flex-col">
      <Group orientation="horizontal" className="flex-1 w-full h-full">
        
        {/* LEFT PANEL: Problem Description */}
        <Panel defaultSize={30} minSize={15}>
          <div className="h-full flex flex-col border-r border-slate-800 bg-slate-950">
            {/* Header */}
            <div className="shrink-0 bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-200">
                {PROBLEMS[activeProblemId as keyof typeof PROBLEMS]?.title || 'Loading Problem...'}
              </h2>
              {/* Host Controls */}
              {isHost && (
                <select 
                  value={activeProblemId}
                  onChange={handleProblemChange}
                  className="bg-slate-800 text-slate-200 border border-slate-600 rounded px-2 py-1 text-xs font-medium outline-none focus:border-blue-500"
                >
                  {Object.values(PROBLEMS).map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              )}
            </div>
            
            {/* Description Body */}
            <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed text-slate-300">
               {PROBLEMS[activeProblemId as keyof typeof PROBLEMS]?.description}
            </div>
          </div>
        </Panel>

        {/* DRAG HANDLE */}
        <Separator className="w-1.5 bg-slate-800 hover:bg-blue-600 active:bg-blue-500 transition-colors cursor-col-resize flex flex-col justify-center items-center">
          {/* Optional: Add little grip dots */}
          <div className="h-4 w-0.5 bg-slate-600 rounded-full"></div>
        </Separator>

        {/* RIGHT PANEL: Editor & Terminal */}
        <Panel defaultSize={70}>
          <div className="flex flex-col h-full w-full gap-2 overflow-hidden p-2">
            
            {/* Action Bar */}
            <div className="shrink-0 flex justify-between items-center bg-slate-900 p-2 rounded-md border border-slate-700">
              <span className="text-sm text-slate-400 ml-2 font-mono">main.cpp</span>
              <button
                onClick={handleRunCode}
                disabled={isExecuting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2"
              >
                {isExecuting ? 'Running...' : '▶ Run Code'}
              </button>
            </div>

            {/* Editor Space */}
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
                onMount={handleEditorDidMount}
              />
            </div>

            {/* Bottom Panel (Stdin + Output) */}
            <div className="shrink-0 flex gap-2" style={{ height: '180px' }}>
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
        </Panel>

      </Group>
    </div>
  );
}