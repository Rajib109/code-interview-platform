import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal, Sparkles, ArrowRight, Code2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-background">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="px-6 py-4 flex items-center justify-between glass sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/30">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <span className="text-foreground">CodeInterview</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link 
            href="/login" 
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Log in
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="rounded-full px-6 hover-glow transition-all duration-300">
              Dashboard
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 md:py-32 text-center relative z-10">
        
        {/* Subtle Feature Badge */}
        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium mb-8 text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)] animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles className="h-4 w-4 mr-2" />
          Socratic AI Assistant Included
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          Collaborative Code Interviews, <br className="hidden sm:block" />
          <span className="text-gradient">Without the Friction.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          Write code, execute securely in Docker sandboxes, and collaborate in real-time with zero-conflict sync. A premium experience for both interviewer and candidate.
        </p>

        {/* Call to Action Area */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="lg" className="w-full h-14 px-8 text-base rounded-xl hover-glow bg-primary hover:bg-primary/90 text-primary-foreground">
              Create a New Room
            </Button>
          </Link>
          <div className="flex w-full items-center space-x-2 relative group">
            <Input 
              type="text" 
              placeholder="Enter Room ID" 
              className="h-14 bg-background/50 backdrop-blur-sm border-white/10 rounded-xl focus:border-primary/50 transition-colors pl-4 pr-32" 
            />
            <Button type="submit" size="sm" variant="secondary" className="absolute right-1.5 top-1.5 bottom-1.5 h-auto rounded-lg px-4 hover:bg-secondary/80 transition-colors">
              Join <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stylized Editor Mockup */}
        <div className="mt-24 w-full max-w-5xl glass-card rounded-2xl overflow-hidden flex flex-col transform perspective-1000 md:rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          {/* Mac-style Window Header */}
          <div className="h-14 border-b border-white/10 bg-black/40 flex items-center px-4 justify-between relative">
            <div className="flex gap-2">
              <div className="h-3.5 w-3.5 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors"></div>
              <div className="h-3.5 w-3.5 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors"></div>
              <div className="h-3.5 w-3.5 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors"></div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs font-mono text-muted-foreground bg-black/30 px-3 py-1 rounded-md border border-white/5">
              <Code2 className="w-3.5 h-3.5" />
              solution.cpp
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-[10px] font-bold text-primary">I</div>
                <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-[10px] font-bold text-purple-400">C</div>
              </div>
            </div>
          </div>
          {/* Code Area */}
          <div className="p-8 text-left font-mono text-sm md:text-base text-slate-300 bg-[#0d1117]/80 min-h-[350px] leading-relaxed">
            <p><span className="text-pink-400">#include</span> <span className="text-green-300">&lt;vector&gt;</span></p>
            <p><span className="text-pink-400">using namespace</span> <span className="text-blue-300">std</span>;</p>
            <br />
            <p><span className="text-blue-400">vector</span>&lt;<span className="text-blue-400">int</span>&gt; <span className="text-yellow-200">twoSum</span>(<span className="text-blue-400">vector</span>&lt;<span className="text-blue-400">int</span>&gt;&amp; nums, <span className="text-blue-400">int</span> target) {"{"}</p>
            <p className="pl-6 mt-2"><span className="text-slate-500">/* Optimized approach using a hash map */</span></p>
            <p className="pl-6 mt-2 flex items-center h-6"><span className="w-2.5 h-5 bg-primary animate-pulse inline-block shadow-[0_0_8px_rgba(var(--primary),0.8)]"></span></p>
            <p>{"}"}</p>
          </div>
        </div>
      </main>
    </div>
  );
}