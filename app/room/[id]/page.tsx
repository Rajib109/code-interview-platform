// app/room/[id]/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CollaborativeEditor from '@/components/editor/CollaborativeEditor'
import PresenceSidebar from '@/components/sidebar/PresenceSidebar'
import GripHandle from '@/components/ui/GripHandle'
import { Group, Panel } from 'react-resizable-panels'

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
        <Group orientation="horizontal" id="main-layout" className="flex-1 w-full h-full">
          {/* SIDEBAR PANEL */}
          <Panel id="sidebar-panel" defaultSize={20} collapsible={true} minSize={10} maxSize={200}>
            <PresenceSidebar roomId={id} userEmail={user.email} />
          </Panel>
          
          {/* DRAG HANDLE */}
          <GripHandle direction="horizontal" />

          {/* EDITOR PANEL */}
          <Panel id="main-editor-panel" minSize={30}>
            <div className="flex-1 min-h-0 flex flex-col p-4 bg-[#1e1e1e] h-full w-full">
              <CollaborativeEditor roomId={id} userEmail={user.email} isHost={false} />
            </div>
          </Panel>
        </Group>
      </main>
    </div>
  )
}