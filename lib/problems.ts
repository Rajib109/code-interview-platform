/**
 * Problem definitions for the interview platform.
 *
 * Each problem has an ID, display title, description text,
 * and C++ starter code that gets inserted into the editor.
 */

export interface Problem {
  id: string;
  title: string;
  description: string;
  starterCode: string; // Map from DB's starter_code
  testCases?: unknown[];   // DB test_cases
}

import { createClient } from '@/utils/supabase/server';

export async function getProblems(): Promise<Record<string, Problem>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('problems').select('*');
  
  if (error || !data) {
    console.error('Error fetching problems:', error);
    return {};
  }
  
  const problemsMap: Record<string, Problem> = {};
  for (const row of data) {
    problemsMap[row.id] = {
      id: row.id,
      title: row.title,
      description: row.description,
      starterCode: row.starter_code,
      testCases: row.test_cases,
    };
  }
  
  return problemsMap;
}
