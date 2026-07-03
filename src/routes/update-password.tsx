import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Sparkles, ArrowRight, ShieldCheck, Zap, GitPullRequest } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

type SearchParams = {
  token?: string;
};

export const Route = createFileRoute("/update-password")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      token: typeof search.token === "string" ? search.token : undefined,
    };
  },
  head: () => ({ meta: [{ title: "Update Password — DevReview AI" }] }),
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !token) {
      alert("Missing password or invalid token! Make sure you clicked the exact link from your email.");
      return;
    }

    setLoading(true);
    try {
      const data = await fetchApi("/auth/update-password", {
        method: "POST",
        body: JSON.stringify({ token, password })
      });
      // The backend verified the token, updated the password, and returned the new session!
      if (data.session?.access_token) {
        useAuthStore.getState().setAuth(data.session.access_token);
        await useAuthStore.getState().loadSession();
      }
      alert("Password updated successfully!");
      router.navigate({ to: "/" });
    } catch (err: any) {
      alert(err.message || "Failed to update password");
    } finally {
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
            Choose a new password
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Almost done. Enter your new password below.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">New Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" placeholder="At least 8 characters" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent shadow-[0_0_20px_-4px_var(--primary)]">
              {loading ? "Updating..." : <>Update Password <ArrowRight className="ml-1.5 h-4 w-4" /></>}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
