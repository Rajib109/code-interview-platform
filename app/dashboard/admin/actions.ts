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

  // Check admin role via RPC (bypasses RLS), with fallback
  const { data: rpcRole, error: rpcError } = await supabase
    .rpc('get_user_role', { lookup_user_id: user.id });

  let dbRole: string | null = null;
  if (rpcError) {
    // Fallback to direct query
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    dbRole = roleData?.role ?? null;
  } else {
    dbRole = rpcRole;
  }

  const metaRole = (user.app_metadata?.role || user.user_metadata?.role) as string | undefined;
  const isAdmin =
    dbRole?.toLowerCase() === 'admin' ||
    metaRole?.toLowerCase() === 'admin' ||
    user.app_metadata?.is_admin === true ||
    user.user_metadata?.is_admin === true;

  if (!isAdmin) {
    return { error: 'Unauthorized: Admins only' };
  }

  let testCases = [];
  if (testCasesString) {
    try {
      testCases = JSON.parse(testCasesString);
    } catch {
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

/**
 * Delete a problem by ID.
 * Performs the same admin role check as saveProblem before allowing deletion.
 */
export async function deleteProblem(problemId: string) {
  const supabase = await createClient();

  if (!problemId) {
    return { error: 'Missing problem ID' };
  }

  // Enforce admin role — same logic as saveProblem
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data: rpcRole, error: rpcError } = await supabase
    .rpc('get_user_role', { lookup_user_id: user.id });

  let dbRole: string | null = null;
  if (rpcError) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    dbRole = roleData?.role ?? null;
  } else {
    dbRole = rpcRole;
  }

  const metaRole = (user.app_metadata?.role || user.user_metadata?.role) as string | undefined;
  const isAdmin =
    dbRole?.toLowerCase() === 'admin' ||
    metaRole?.toLowerCase() === 'admin' ||
    user.app_metadata?.is_admin === true ||
    user.user_metadata?.is_admin === true;

  if (!isAdmin) {
    return { error: 'Unauthorized: Admins only' };
  }

  const { error } = await supabase
    .from('problems')
    .delete()
    .eq('id', problemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/admin');
  revalidatePath('/room/[id]', 'page');
  return { success: true };
}
