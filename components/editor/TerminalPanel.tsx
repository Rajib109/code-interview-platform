/**
 * TerminalPanel — Bottom panel with Custom Input (stdin) and Terminal Output.
 */

'use client';

interface TerminalPanelProps {
  stdinInput: string;
  output: string;
  onStdinChange: (value: string) => void;
}

export default function TerminalPanel({
  stdinInput,
  output,
  onStdinChange,
}: TerminalPanelProps) {
  return (
    <div className="shrink-0 flex gap-2" style={{ height: '180px' }}>
      {/* Stdin Panel */}
      <div className="flex-1 bg-black rounded-md border border-slate-800 flex flex-col overflow-hidden">
        <div className="bg-slate-900 px-4 py-1.5 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
          Custom Input (stdin)
        </div>
        <textarea
          value={stdinInput}
          onChange={(e) => onStdinChange(e.target.value)}
          placeholder={'Enter input here, e.g.:\n4\n2 7 11 15\n9'}
          className="flex-1 w-full bg-transparent p-3 font-mono text-sm text-slate-300 resize-none outline-none placeholder-slate-600"
          spellCheck={false}
        />
      </div>

      {/* Output Panel */}
      <div className="flex-1 bg-black rounded-md border border-slate-800 flex flex-col overflow-hidden">
        <div className="bg-slate-900 px-4 py-1.5 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
          Terminal Output
        </div>
        <div className="flex-1 p-3 overflow-y-auto font-mono text-sm text-slate-300 whitespace-pre-wrap">
          {output || 'Click "Run Code" to see output here.'}
        </div>
      </div>
    </div>
  );
}
