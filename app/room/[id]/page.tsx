// app/room/[id]/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CollaborativeEditor from '@/components/editor/CollaborativeEditor'
import PresenceSidebar from '@/components/sidebar/PresenceSidebar'
import GripHandle from '@/components/ui/GripHandle'
import { Group, Panel } from 'react-resizable-panels'
import { Terminal, LogOut, ChevronRight, Code2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
      <div className="flex-1 flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <div className="glass-card p-8 rounded-xl flex flex-col items-center max-w-md text-center">
          <Terminal className="h-10 w-10 text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Room Not Found</h2>
          <p className="text-muted-foreground mb-6">The room you are trying to join does not exist or has been closed.</p>
          <Link href="/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-slate-300">
      {/* Sleek IDE Top Bar */}
      <header className="h-12 flex justify-between items-center px-4 border-b border-white/5 bg-[#121214] shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-primary hover:text-primary/80 transition-colors">
            <Terminal className="h-5 w-5" />
          </Link>
          <div className="flex items-center text-sm font-medium text-muted-foreground">
            <ChevronRight className="h-4 w-4 mx-1 opacity-50" />
            <span className="text-slate-300 flex items-center gap-2">
              <Code2 className="h-4 w-4" /> Live Interview
            </span>
            <ChevronRight className="h-4 w-4 mx-1 opacity-50" />
            <span className="font-mono text-xs opacity-70 truncate max-w-[120px]">{id}</span>
          </div>
        </div>
        
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-950/30 gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Leave Room</span>
          </Button>
        </Link>
      </header>
      
      {/* 3. Render Sidebar and Editor side-by-side */}
      <main className="flex-1 flex overflow-hidden">
        <Group orientation="horizontal" id="main-layout" className="flex-1 w-full h-full">
          {/* SIDEBAR PANEL */}
          <Panel id="sidebar-panel" defaultSize={20} collapsible={true} minSize={10} maxSize={200} className="bg-[#121214] border-r border-white/5">
            <PresenceSidebar roomId={id} userEmail={user.email} />
          </Panel>
          
          {/* DRAG HANDLE */}
          <GripHandle direction="horizontal" />

          {/* EDITOR PANEL */}
          <Panel id="main-editor-panel" minSize={30}>
            <div className="flex-1 min-h-0 flex flex-col bg-[#0d1117] h-full w-full">
              <CollaborativeEditor roomId={id} userEmail={user.email} isHost={false} />
            </div>
          </Panel>
        </Group>
      </main>
    </div>
  )
}