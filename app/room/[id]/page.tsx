import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Ensure the user is authenticated to be in here
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Verify the room actually exists
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !room) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen bg-slate-900 text-slate-300">
        <p>Error: Room not found or has been closed.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      <header className="flex justify-between items-center p-4 border-b border-slate-700">
        <div>
          <h1 className="font-semibold text-lg">Live Interview</h1>
          <p className="text-xs text-slate-400 font-mono">Room: {id}</p>
        </div>
        <button className="bg-red-600 hover:bg-red-700 transition-colors px-4 py-2 rounded text-sm font-medium">
          Leave Room
        </button>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full h-full border border-dashed border-slate-700 rounded-lg flex items-center justify-center">
          {/* We will mount the Monaco editor here later */}
          <p className="text-slate-500 font-mono">Code Editor Placeholder (C++ Ready)</p>
        </div>
      </main>
    </div>
  )
}