import { login, signup } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const { message } = await searchParams;

  return (
    <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden bg-background">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Simple Header */}
      <header className="px-6 py-4 flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/30">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <span className="text-foreground">CodeInterview</span>
        </Link>
      </header>

      <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center items-center mx-auto relative z-10 pb-20">
        <div className="w-full glass-card p-8 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
            <p className="text-muted-foreground text-sm text-center">Sign in to your account or create a new one to start collaborating.</p>
          </div>

          <form className="flex flex-col w-full gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80" htmlFor="email">
                Email
              </label>
              <Input
                className="bg-background/50 border-white/10 focus-visible:ring-primary h-11"
                name="email"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80" htmlFor="password">
                Password
              </label>
              <Input
                className="bg-background/50 border-white/10 focus-visible:ring-primary h-11"
                type="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <Button
                type="submit"
                formAction={login}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground hover-glow"
              >
                Sign In
              </Button>
              <Button
                type="submit"
                formAction={signup}
                variant="outline"
                className="w-full h-11 border-white/10 hover:bg-white/5"
              >
                Sign Up
              </Button>
            </div>

            {message && (
              <div
                className={`mt-4 p-3 border text-sm rounded-lg text-center animate-in fade-in ${
                  message.toLowerCase().includes("success") || message.toLowerCase().includes("verify")
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
              >
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
