'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveProblem(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get('id') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const starterCode = formData.get('starterCode') as string;
  const testCasesString = formData.get('testCases') as string;

  if (!id || !title || !description || !starterCode) {
    return { error: 'Missing required fields' };
  }

  // Enforce global admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!roleData || roleData.role !== 'admin') {
    return { error: 'Unauthorized: Admins only' };
  }

  let testCases = [];
  if (testCasesString) {
    try {
      testCases = JSON.parse(testCasesString);
    } catch (e) {
      return { error: 'Invalid JSON for test cases' };
    }
  }

  const { error } = await supabase
    .from('problems')
    .upsert({
      id,
      title,
      description,
      starter_code: starterCode,
      test_cases: testCases,
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/admin');
  revalidatePath('/room/[id]', 'page');
  return { success: true };
}
