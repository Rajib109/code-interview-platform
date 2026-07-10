// app/room/[id]/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CollaborativeEditor from '@/components/CollaborativeEditor'
import PresenceSidebar from '@/components/PresenceSidebar'

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    redirect('/login')
  }

  // 2. Verify the room exists
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !room) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen bg-slate-950 text-slate-300">
        <p>Error: Room not found or has been closed.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      <header className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900">
        <div>
          <h1 className="font-semibold text-lg">Live Interview</h1>
          <p className="text-xs text-slate-400 font-mono">Room: {id}</p>
        </div>
        <button className="bg-red-600 hover:bg-red-700 transition-colors px-4 py-2 rounded text-sm font-medium">
          Leave Room
        </button>
      </header>
      
      {/* 3. Render Sidebar and Editor side-by-side */}
      <main className="flex-1 flex overflow-hidden">
        <PresenceSidebar roomId={id} userEmail={user.email} />
        
        <div className="flex-1 min-h-0 flex flex-col p-4 bg-[#1e1e1e]">
          <CollaborativeEditor roomId={id} userEmail={user.email} />
        </div>
      </main>
    </div>
  )
}