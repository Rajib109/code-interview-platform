import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { saveProblem } from './actions';

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    redirect('/login');
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
          <form action={saveProblem} className="flex flex-col gap-4">
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
