import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Github, Mail, Lock, User, Sparkles, ArrowRight, ShieldCheck, Zap, GitPullRequest } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "@tanstack/react-router";
export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — DevReview AI" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const errorDescription = params.get("error_description");
    if (error) {
      alert(`Login Error: ${errorDescription || error}`);
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await fetchApi("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      useAuthStore.getState().setAuth(data.session?.access_token, data.session?.refresh_token);
      await useAuthStore.getState().loadSession();
      router.navigate({ to: "/" });
    } catch (err: any) {
      alert(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchApi("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name: name })
      });
      alert("Check your email for the confirmation link!");
    } catch (err: any) {
      alert(err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setLoading(true);
    try {
      const { url } = await fetchApi("/auth/github");
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No URL returned");
      }
    } catch (err: any) {
      alert(err.message || "Failed to start GitHub login");
      setLoading(false);
    }
  };



  return (
    <div className="relative grid min-h-screen w-full lg:grid-cols-2">
      {/* Left: marketing panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-background via-background to-primary/10 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-[0_0_30px_-6px_var(--primary)]">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-base font-bold tracking-tight">DevReview</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">AI Platform</span>
          </div>
        </Link>

        <div className="relative space-y-8">
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight tracking-tight">
              Ship code with <span className="gradient-text">AI on your team</span>.
            </h2>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Automatic PR reviews, DevOps generation, and multi-agent workflows
              connected to your GitHub and Telegram in minutes.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              { icon: ShieldCheck, text: "SOC 2 Type II & GDPR compliant" },
              { icon: Zap, text: "Reviews 10k+ lines in under 30s" },
              { icon: GitPullRequest, text: "Native GitHub PR integration" },
            ].map((f) => (
              <div key={f.text} className="glass flex items-center gap-3 rounded-lg border border-border/60 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-accent/20">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex -space-x-2">
            {["JD", "MK", "AR", "SL"].map((i, idx) => (
              <div key={i} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary to-accent text-[10px] font-bold text-primary-foreground" style={{ zIndex: 4 - idx }}>
                {i}
              </div>
            ))}
          </div>
          <span>Trusted by 12,400+ engineers</span>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-base font-bold">DevReview</span>
          </Link>

          <h1 className="font-display text-2xl font-bold tracking-tight">
            {tab === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {tab === "signin" ? "Sign in to continue to your workspace." : "Start your 14-day free trial. No card required."}
          </p>

          <div className="mt-6 grid gap-2">
            <Button variant="outline" className="w-full justify-center gap-2" onClick={handleGithubLogin} disabled={loading}>
              <Github className="h-4 w-4" />Continue with GitHub
            </Button>
            <Button variant="outline" className="w-full justify-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".7"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" opacity=".5"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" opacity=".3"/></svg>
              Continue with Google
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-5 space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Field id="email" label="Email" icon={Mail} type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Field id="password" label="Password" icon={Lock} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} rightSlot={<Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>} />
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent shadow-[0_0_20px_-4px_var(--primary)]">
                  {loading ? "Signing in..." : <>Sign in <ArrowRight className="ml-1.5 h-4 w-4" /></>}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5 space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <Field id="name" label="Full name" icon={User} placeholder="Jane Developer" value={name} onChange={(e) => setName(e.target.value)} />
                <Field id="email" label="Work email" icon={Mail} type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Field id="password" label="Password" icon={Lock} type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent shadow-[0_0_20px_-4px_var(--primary)]">
                  {loading ? "Creating..." : <>Create account <ArrowRight className="ml-1.5 h-4 w-4" /></>}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  By signing up you agree to our <a href="#" className="text-foreground hover:underline">Terms</a> and <a href="#" className="text-foreground hover:underline">Privacy Policy</a>.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Field({
  id, label, icon: Icon, type = "text", placeholder, rightSlot, value, onChange
}: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; type?: string; placeholder?: string; rightSlot?: React.ReactNode; value?: string; onChange?: (e: any) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs">{label}</Label>
        {rightSlot}
      </div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} type={type} placeholder={placeholder} className="pl-9" value={value} onChange={onChange} />
      </div>
    </div>
  );
}
