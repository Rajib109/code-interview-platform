import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createRoom } from './actions'
import { Terminal, Plus, Clock, Users, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Dashboard Header */}
      <header className="px-8 py-4 border-b border-white/10 glass sticky top-0 z-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/30">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <span>Dashboard</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center font-bold text-white shadow-lg">
            {user.email?.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-8 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          <p className="text-muted-foreground">Manage your interviews and track your progress.</p>
        </div>

        {/* Stats Grid (Mock Data for Aesthetics) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-card p-6 rounded-xl border border-white/5 flex items-center gap-4 hover-glow">
            <div className="bg-blue-500/10 p-3 rounded-lg text-blue-400">
              <Code className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Interviews Conducted</p>
              <h3 className="text-2xl font-bold">12</h3>
            </div>
          </div>
          <div className="glass-card p-6 rounded-xl border border-white/5 flex items-center gap-4 hover-glow">
            <div className="bg-purple-500/10 p-3 rounded-lg text-purple-400">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Hours Coded</p>
              <h3 className="text-2xl font-bold">34.5</h3>
            </div>
          </div>
          <div className="glass-card p-6 rounded-xl border border-white/5 flex items-center gap-4 hover-glow">
            <div className="bg-green-500/10 p-3 rounded-lg text-green-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Candidates Assessed</p>
              <h3 className="text-2xl font-bold">8</h3>
            </div>
          </div>
        </div>

        {/* Main Action Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">Recent Rooms</h2>
            <div className="glass-card rounded-xl border border-white/5 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="bg-white/5 p-4 rounded-full mb-4">
                <Terminal className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">You haven't conducted any interviews recently.</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <div className="glass-card p-6 rounded-xl border border-white/10 bg-gradient-to-b from-card/60 to-background shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="bg-primary/20 p-4 rounded-full mb-6 text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                  <Plus className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">New Interview</h3>
                <p className="text-sm text-muted-foreground mb-8">
                  Create a secure, sandboxed room for real-time collaboration.
                </p>
                <form action={createRoom} className="w-full">
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-md font-semibold hover-glow"
                  >
                    Create Room
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}