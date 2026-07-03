import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createRoom } from './actions'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="max-w-4xl mx-auto mt-20 p-6">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-2xl font-bold">Interview Dashboard</h1>
        <p className="text-sm text-gray-500">Logged in as {user.email}</p>
      </div>

      <div className="border rounded-lg p-8 text-center bg-slate-50">
        <h2 className="text-xl mb-4">Ready to start an interview?</h2>
        <form action={createRoom}>
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded-md px-6 py-3 font-medium"
          >
            Create New Interview Room
          </button>
        </form>
      </div>
    </div>
  )
}