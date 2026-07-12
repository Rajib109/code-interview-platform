/**
 * CollaborativeEditor — Main orchestrator component.
 *
 * Composes ProblemPanel, EditorPanel, TerminalPanel, and AiAssistantPanel
 * into a unified interview workspace.  All business logic lives in
 * lib/hooks/useYjsSync and lib/api/execution.
 */

'use client';

import { useState } from 'react';
import { Panel, Group } from 'react-resizable-panels';

import { PROBLEMS } from '@/lib/problems';
import { useYjsSync } from '@/lib/hooks/useYjsSync';
import { runCode, formatExecutionOutput } from '@/lib/api/execution';

import ProblemPanel from './ProblemPanel';
import EditorPanel from './EditorPanel';
import TerminalPanel from './TerminalPanel';
import AiAssistantPanel from './AiAssistantPanel';
import GripHandle from '@/components/ui/GripHandle';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CollaborativeEditorProps {
  roomId: string;
  userEmail: string;
  isHost: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CollaborativeEditor({
  roomId,
  userEmail,
  isHost,
}: CollaborativeEditorProps) {
  // --- Yjs / Supabase sync ---
  const {
    activeProblemId,
    handleEditorDidMount,
    handleProblemChange,
    editorRef,
  } = useYjsSync({ roomId, userEmail, isHost });

  // --- Local UI state ---
  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [stdinInput, setStdinInput] = useState<string>('');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState('');

  // --- Handlers ---

  const handleRunCode = async () => {
    if (!editorRef.current) return;

    const code = editorRef.current.getValue();
    setCurrentCode(code);
    setIsExecuting(true);
    setOutput('Compiling and running...');

    try {
      const data = await runCode(code, activeProblemId, stdinInput);
      setOutput(formatExecutionOutput(data));
    } catch {
      setOutput('Failed to connect to the execution engine. Is it running?');
    } finally {
      setIsExecuting(false);
    }
  };

  // Get the current problem's description for the AI panel
  const currentProblem = PROBLEMS[activeProblemId];

  const handleEditorMount = (editorInstance: Parameters<typeof handleEditorDidMount>[0]) => {
    handleEditorDidMount(editorInstance);
    setCurrentCode(editorInstance.getValue());
    editorInstance.onDidChangeModelContent(() => {
      setCurrentCode(editorInstance.getValue());
    });
  };

  return (
    <div className="flex-1 h-full w-full overflow-hidden bg-black text-slate-300 flex">
      {/* Main resizable layout */}
      <Group orientation="horizontal" id="editor-group" className="flex-1 w-full h-full">
        {/* LEFT: Problem Description */}
        <Panel id="problem-panel" defaultSize={30} minSize={15}>
          <ProblemPanel
            activeProblemId={activeProblemId}
            isHost={isHost}
            onProblemChange={handleProblemChange}
          />
        </Panel>

        <GripHandle direction="horizontal" />

        {/* RIGHT: Editor + Terminal */}
        <Panel id="editor-panel" defaultSize={70}>
          <div className="flex h-full w-full overflow-hidden">
            {/* Editor + Terminal column */}
            <div className="flex-1 flex flex-col gap-2 overflow-hidden p-2">
              <EditorPanel
                isExecuting={isExecuting}
                isAiOpen={isAiOpen}
                onRunCode={handleRunCode}
                onToggleAi={() => setIsAiOpen((prev) => !prev)}
                onEditorMount={handleEditorMount}
              />
              <TerminalPanel
                stdinInput={stdinInput}
                output={output}
                onStdinChange={setStdinInput}
              />
            </div>

            {/* AI Assistant (slides in from right) */}
            <AiAssistantPanel
              isOpen={isAiOpen}
              currentCode={currentCode}
              problemDescription={currentProblem?.description ?? ''}
            />
          </div>
        </Panel>
      </Group>
    </div>
  );
}
