'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus, X, Loader2, CheckCircle2 } from 'lucide-react';
import { saveProblem, deleteProblem } from '@/app/dashboard/admin/actions';

/**
 * Shape of a problem row coming from the database.
 * Uses snake_case to match the Supabase schema directly.
 */
interface ProblemRow {
  id: string;
  title: string;
  description: string;
  starter_code: string;
  test_cases: Array<Record<string, unknown>>;
  created_at?: string;
}

interface AdminProblemManagerProps {
  initialProblems: ProblemRow[];
}

type FormMode = 'create' | 'edit';

/**
 * AdminProblemManager — Interactive admin UI for creating, editing,
 * and deleting coding problems.
 *
 * This is a client component because editing requires local state
 * (populating form fields on click, toggling edit mode, etc.)
 */
export default function AdminProblemManager({ initialProblems }: AdminProblemManagerProps) {
  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */
  const [mode, setMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form field values
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStarterCode, setFormStarterCode] = useState('');
  const [formTestCases, setFormTestCases] = useState('[]');

  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Transition for non-blocking server action calls
  const [isPending, startTransition] = useTransition();

  // Ref to scroll the form into view when editing
  const formRef = useRef<HTMLDivElement>(null);

  // Auto-clear feedback after a delay
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  /* ------------------------------------------------------------------ */
  /*  Handlers                                                           */
  /* ------------------------------------------------------------------ */

  /** Populate the form with an existing problem's data for editing. */
  function handleEdit(problem: ProblemRow) {
    setMode('edit');
    setEditingId(problem.id);
    setFormId(problem.id);
    setFormTitle(problem.title);
    setFormDescription(problem.description);
    setFormStarterCode(problem.starter_code);
    setFormTestCases(JSON.stringify(problem.test_cases ?? [], null, 2));
    setFeedback(null);

    // Scroll form into view smoothly
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  /** Reset form back to blank "create" mode. */
  function handleCancelEdit() {
    setMode('create');
    setEditingId(null);
    setFormId('');
    setFormTitle('');
    setFormDescription('');
    setFormStarterCode('');
    setFormTestCases('[]');
    setFeedback(null);
  }

  /** Submit the form — works for both create and edit. */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData();
    formData.set('id', formId);
    formData.set('title', formTitle);
    formData.set('description', formDescription);
    formData.set('starterCode', formStarterCode);
    formData.set('testCases', formTestCases);

    startTransition(async () => {
      const result = await saveProblem(formData);

      if (result?.error) {
        setFeedback({ type: 'error', message: result.error });
      } else {
        const verb = mode === 'edit' ? 'updated' : 'created';
        setFeedback({ type: 'success', message: `Problem "${formTitle}" ${verb} successfully!` });
        handleCancelEdit();
      }
    });
  }

  /** Delete a problem after confirmation. */
  function handleDelete(problemId: string, problemTitle: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${problemTitle}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteProblem(problemId);

      if (result?.error) {
        setFeedback({ type: 'error', message: result.error });
      } else {
        setFeedback({ type: 'success', message: `Problem "${problemTitle}" deleted.` });

        // If the deleted problem was being edited, reset the form
        if (editingId === problemId) {
          handleCancelEdit();
        }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Derived values                                                     */
  /* ------------------------------------------------------------------ */
  const formTitle_heading = mode === 'edit' ? `Editing: ${editingId}` : 'Create New Problem';
  const submitLabel = mode === 'edit' ? 'Update Problem' : 'Save Problem';

  // Shared input styles
  const inputClass =
    'w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm ' +
    'focus:outline-none focus:border-primary transition-colors duration-200';

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* ============================================================ */}
      {/*  Form Panel                                                   */}
      {/* ============================================================ */}
      <div ref={formRef} className="glass-card p-6 rounded-xl border border-white/10">
        {/* Header row with mode indicator and cancel button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {mode === 'edit' ? (
              <>
                <Pencil className="h-5 w-5 text-amber-400" />
                <span className="truncate max-w-[280px]">{formTitle_heading}</span>
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-primary" />
                {formTitle_heading}
              </>
            )}
          </h2>

          {mode === 'edit' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-1"
              onClick={handleCancelEdit}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {feedback.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Problem ID */}
          <div>
            <label htmlFor="problem-id" className="block text-sm font-medium mb-1">
              Problem ID (e.g., two-sum)
            </label>
            <input
              id="problem-id"
              name="id"
              type="text"
              required
              disabled={mode === 'edit'}
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              className={`${inputClass} ${mode === 'edit' ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {mode === 'edit' && (
              <p className="text-xs text-slate-500 mt-1">
                ID cannot be changed while editing.
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="problem-title" className="block text-sm font-medium mb-1">
              Title
            </label>
            <input
              id="problem-title"
              name="title"
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="problem-description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="problem-description"
              name="description"
              required
              rows={4}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Starter Code */}
          <div>
            <label htmlFor="problem-starter-code" className="block text-sm font-medium mb-1">
              Starter Code (C++)
            </label>
            <textarea
              id="problem-starter-code"
              name="starterCode"
              required
              rows={6}
              value={formStarterCode}
              onChange={(e) => setFormStarterCode(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </div>

          {/* Test Cases */}
          <div>
            <label htmlFor="problem-test-cases" className="block text-sm font-medium mb-1">
              Test Cases (JSON array)
            </label>
            <textarea
              id="problem-test-cases"
              name="testCases"
              rows={6}
              value={formTestCases}
              onChange={(e) => setFormTestCases(e.target.value)}
              className={`${inputClass} font-mono`}
            />
            <p className="text-xs text-slate-400 mt-1">
              Format: [{`{"id": "tc_1", "input": "...", "expected_output": "..."}`}]
            </p>
          </div>

          <Button type="submit" className="mt-2" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </form>
      </div>

      {/* ============================================================ */}
      {/*  Problem List Panel                                           */}
      {/* ============================================================ */}
      <div className="glass-card p-6 rounded-xl border border-white/10">
        <h2 className="text-xl font-semibold mb-6">Existing Problems</h2>

        <div className="flex flex-col gap-3">
          {initialProblems.length === 0 && (
            <p className="text-slate-400">No problems found.</p>
          )}

          {initialProblems.map((problem) => {
            const isActive = editingId === problem.id;

            return (
              <div
                key={problem.id}
                className={`bg-slate-900 border p-4 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'border-primary/50 ring-1 ring-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.15)]'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top row: title + test case count */}
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg truncate">{problem.title}</h3>
                    <span className="text-xs font-mono text-slate-400">{problem.id}</span>
                  </div>
                  <div className="text-xs text-slate-500 text-right shrink-0 ml-3">
                    Test cases: {problem.test_cases?.length || 0}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-white/10 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30"
                    onClick={() => handleEdit(problem)}
                    disabled={isPending}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                    onClick={() => handleDelete(problem.id, problem.title)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
