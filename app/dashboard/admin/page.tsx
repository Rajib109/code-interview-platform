import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { saveProblem } from './actions';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    redirect('/login');
  }

  // Check role using SECURITY DEFINER RPC function (bypasses RLS)
  // Falls back to direct table query and user metadata checks
  let dbRole: string | null = null;
  let dbError: string | null = null;

  // Primary: use RPC function that bypasses RLS
  const { data: rpcRole, error: rpcError } = await supabase
    .rpc('get_user_role', { lookup_user_id: user.id });

  if (rpcError) {
    // RPC function might not exist yet — fall back to direct query
    dbError = rpcError.message;
    const { data: roleData, error: directError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    dbRole = roleData?.role ?? null;
    if (directError) {
      dbError += ` | Direct query: ${directError.message}`;
    }
  } else {
    dbRole = rpcRole;
  }

  // Also check user metadata as a fallback
  const metaRole = (user.app_metadata?.role || user.user_metadata?.role) as string | undefined;
  const isMetaAdmin =
    metaRole?.toLowerCase() === 'admin' ||
    user.app_metadata?.is_admin === true ||
    user.user_metadata?.is_admin === true;

  const isDbAdmin = dbRole?.toLowerCase() === 'admin';
  const isAdmin = isDbAdmin || isMetaAdmin;

  console.log('[Admin Check]', {
    userId: user.id,
    email: user.email,
    dbRole,
    isDbAdmin,
    isMetaAdmin,
    dbError,
    rpcWorked: !rpcError,
  });

  if (!isAdmin) {
    return (
      <div className="flex-1 min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <div className="max-w-xl w-full glass-card p-8 rounded-2xl border border-white/10 shadow-2xl text-center animate-in fade-in">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your account (<span className="text-foreground font-medium">{user.email}</span>) is not recognized as an administrator.
          </p>

          {/* Diagnostic status */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4 text-left mb-6 text-xs font-mono space-y-1.5 text-slate-300">
            <div className="font-sans font-semibold text-slate-400 mb-1">Status Diagnostics:</div>
            <div><span className="text-slate-500">User ID:</span> {user.id}</div>
            <div><span className="text-slate-500">DB Role (via RPC):</span> {dbRole ?? 'None'}</div>
            {dbError && (
              <div className="text-red-400"><span className="text-slate-500">DB Error:</span> {dbError}</div>
            )}
            <div><span className="text-slate-500">Metadata Role:</span> {metaRole ?? 'None'}</div>
            <div><span className="text-slate-500">RPC Function:</span> {rpcError ? '❌ Missing — run migration below' : '✅ Available'}</div>
          </div>

          <div className="bg-slate-900/90 border border-white/10 rounded-xl p-4 text-left mb-6 font-mono text-xs text-slate-300">
            <div className="text-slate-400 font-sans text-xs font-semibold mb-2">
              Run this in your Supabase SQL Editor:
            </div>
            <pre className="overflow-x-auto text-primary whitespace-pre-wrap select-all font-mono leading-relaxed">
{`-- Step 1: Create the RPC function (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(lookup_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = lookup_user_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;

-- Step 2: Ensure your user has the admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('${user.id}', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';`}
            </pre>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full gap-2 border-white/10">
                <ArrowLeft className="h-4 w-4" /> Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch all problems
  const { data: problems } = await supabase.from('problems').select('*').order('created_at', { ascending: false });

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-8">Problem Administration</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="glass-card p-6 rounded-xl border border-white/10">
          <h2 className="text-xl font-semibold mb-6">Create / Edit Problem</h2>
          <form
            action={async (formData: FormData) => {
              'use server';
              // Envolver la acción del servidor para cumplir con el tipo void que espera el formulario
              await saveProblem(formData);
            }}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Problem ID (e.g., two-sum)</label>
              <input name="id" type="text" required className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input name="title" type="text" required className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea name="description" required rows={4} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Starter Code (C++)</label>
              <textarea name="starterCode" required rows={6} className="w-full font-mono bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Test Cases (JSON array)</label>
              <textarea name="testCases" rows={6} className="w-full font-mono bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary" defaultValue="[]"></textarea>
              <p className="text-xs text-slate-400 mt-1">Format: [{`{"id": "tc_1", "input": "...", "expected_output": "..."}`}]</p>
            </div>
            
            <Button type="submit" className="mt-2">Save Problem</Button>
          </form>
        </div>

        {/* List of Problems */}
        <div className="glass-card p-6 rounded-xl border border-white/10">
          <h2 className="text-xl font-semibold mb-6">Existing Problems</h2>
          <div className="flex flex-col gap-3">
            {problems?.length === 0 && (
              <p className="text-slate-400">No problems found.</p>
            )}
            {problems?.map((p) => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 p-4 rounded flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{p.title}</h3>
                  <span className="text-xs font-mono text-slate-400">{p.id}</span>
                </div>
                <div className="text-xs text-slate-500 text-right">
                  Test cases: {p.test_cases?.length || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
