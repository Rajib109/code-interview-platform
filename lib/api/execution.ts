/**
 * Client-side API functions for the execution engine.
 *
 * Centralizes all fetch calls to the Python backend so components
 * don't embed raw URLs and response parsing inline.
 */

const ENGINE_BASE_URL = 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Code Execution
// ---------------------------------------------------------------------------

export interface ExecutionResult {
  status: string;
  output?: string;
  message?: string;
  details?: string;
  total_cases?: number;
  passed_cases?: number;
  results?: TestCaseResult[];
}

export interface TestCaseResult {
  id: string;
  passed: boolean;
  input?: string;
  expected?: string;
  actual?: string;
  error?: string;
}

/**
 * Send code to the execution engine.  If `stdinInput` is provided,
 * runs in freeplay mode; otherwise tests against the given problem.
 */
export async function runCode(
  code: string,
  problemId: string,
  stdinInput: string
): Promise<ExecutionResult> {
  const payload = stdinInput.trim()
    ? { code, stdin: stdinInput }
    : { code, problem_id: problemId };

  const response = await fetch(`${ENGINE_BASE_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.json();
}

/**
 * Format a raw ExecutionResult into a human-readable terminal string.
 */
export function formatExecutionOutput(data: ExecutionResult): string {
  if (data.results) {
    const lines = data.results.map((r) => {
      const icon = r.passed ? '✅' : '❌';
      let line = `${icon} ${r.id}: ${r.passed ? 'PASSED' : 'FAILED'}`;
      if (!r.passed) {
        line += `\n   Input:    ${r.input?.trim()}\n   Expected: ${r.expected?.trim()}\n   Actual:   ${r.actual?.trim() || r.error || 'N/A'}`;
      }
      return line;
    });
    const summary = `\n\n━━━ ${data.passed_cases}/${data.total_cases} test cases passed ━━━`;
    return lines.join('\n\n') + summary;
  }

  if (data.status === 'success') {
    return data.output || '(no output)';
  }

  return `Error: ${data.message}\n\n${data.output || data.details || ''}`;
}

// ---------------------------------------------------------------------------
// AI Assistant
// ---------------------------------------------------------------------------

export interface HintResponse {
  hintType: string;
  message: string;
  estimatedComplexity: {
    current: string;
    target: string;
  };
}

/**
 * Request an AI-generated hint from the backend.
 */
export async function getAiHint(
  problemDescription: string,
  currentCode: string,
  requestType: 'general' | 'edge_case' | 'complexity' = 'general'
): Promise<HintResponse> {
  const response = await fetch(`${ENGINE_BASE_URL}/ai/hint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      problem_description: problemDescription,
      current_code: currentCode,
      request_type: requestType,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}
