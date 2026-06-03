import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, Github, Send, Users, Rocket, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get started — DevReview AI" }] }),
  component: OnboardingPage,
});

const steps = [
  { id: 1, title: "Workspace", icon: Sparkles, desc: "Name your workspace" },
  { id: 2, title: "Connect GitHub", icon: Github, desc: "Link your repositories" },
  { id: 3, title: "Invite team", icon: Users, desc: "Add your collaborators" },
  { id: 4, title: "Telegram", icon: Send, desc: "Optional notifications" },
];

function OnboardingPage() {
  const [step, setStep] = useState(1);
  const pct = (step / steps.length) * 100;

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute inset-x-0 top-0 h-px bg-border">
        <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-sm font-bold">DevReview AI</span>
        </Link>
        <span className="text-xs text-muted-foreground">Step {step} of {steps.length}</span>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[260px,1fr]">
        <aside className="space-y-2">
          {steps.map((s) => {
            const done = s.id < step;
            const active = s.id === step;
            return (
              <div key={s.id} className={`flex items-start gap-3 rounded-lg p-3 transition ${active ? "border border-primary/40 bg-primary/5" : ""}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-emerald-500/20 text-emerald-400" : active ? "bg-gradient-to-br from-primary to-accent text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {done ? <Check className="h-4 w-4" /> : s.id}
                </div>
                <div>
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
              </div>
            );
          })}
        </aside>

        <Card className="glass p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold">Create your workspace</h2>
              <p className="text-sm text-muted-foreground">All your projects, agents, and reviews live here.</p>
              <div className="space-y-3">
                <div><Label>Workspace name</Label><Input className="mt-1.5" defaultValue="Acme Engineering" /></div>
                <div><Label>Workspace URL</Label><div className="mt-1.5 flex"><span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-muted/40 px-3 text-xs text-muted-foreground">devreview.ai/</span><Input className="rounded-l-none" defaultValue="acme" /></div></div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold">Connect GitHub</h2>
              <p className="text-sm text-muted-foreground">Install the GitHub App to enable PR reviews.</p>
              <Button className="w-full justify-center gap-2 bg-[#24292e] text-white hover:bg-[#24292e]/90"><Github className="h-4 w-4" />Install DevReview App</Button>
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Or skip and connect later</div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold">Invite your team</h2>
              <p className="text-sm text-muted-foreground">Add up to 5 teammates on the free plan.</p>
              {[1,2,3].map((i) => (<Input key={i} placeholder={`teammate${i}@company.com`} />))}
              <button className="text-xs text-primary hover:underline">+ Add another</button>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold">Telegram notifications</h2>
              <p className="text-sm text-muted-foreground">Get PR reviews and alerts directly in Telegram.</p>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600"><Send className="h-5 w-5 text-white" /></div>
                <div className="flex-1"><div className="text-sm font-medium">@DevReviewBot</div><div className="text-xs text-muted-foreground">Click to start chat</div></div>
                <Button size="sm">Connect</Button>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>
            {step < steps.length ? (
              <Button onClick={() => setStep(step + 1)} className="bg-gradient-to-r from-primary to-accent">Continue <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
            ) : (
              <Button asChild className="bg-gradient-to-r from-primary to-accent"><Link to="/"><Rocket className="mr-1.5 h-4 w-4" />Enter workspace</Link></Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
