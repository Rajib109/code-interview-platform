/**
 * ProblemPanel — Left panel showing the problem description.
 *
 * For hosts, it also renders a problem selector dropdown
 * that syncs the active problem across all participants.
 */

'use client';

import { type Problem } from '@/lib/problems';

interface ProblemPanelProps {
  activeProblemId: string;
  isHost: boolean;
  onProblemChange: (problemId: string, starterCode: string) => void;
  problems: Record<string, Problem>;
}

export default function ProblemPanel({
  activeProblemId,
  isHost,
  onProblemChange,
  problems,
}: ProblemPanelProps) {
  const problem: Problem | undefined = problems[activeProblemId];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    const selected = problems[newId];
    if (selected) {
      onProblemChange(newId, selected.starterCode);
    }
  };

  return (
    <div className="h-full flex flex-col border-r border-slate-800 bg-slate-950">
      {/* Header */}
      <div className="shrink-0 bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-slate-200">
          {problem?.title || 'Loading Problem...'}
        </h2>

        {/* Host Controls */}
        {isHost && (
          <select
            value={activeProblemId}
            onChange={handleChange}
            className="bg-slate-800 text-slate-200 border border-slate-600 rounded px-2 py-1 text-xs font-medium outline-none focus:border-blue-500"
          >
            {Object.values(problems).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Description Body */}
      <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed text-slate-300">
        {problem?.description}
      </div>
    </div>
  );
}
