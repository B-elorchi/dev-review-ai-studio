import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Rocket, Compass, BookOpen, Send, Sparkles, Bot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/agents")({
  head: () => ({ meta: [{ title: "AI Agents — DevReview AI" }] }),
  component: AgentsPage,
});

const agents = [
  { id: "review", name: "Code Reviewer", icon: ShieldCheck, gradient: "from-blue-500 to-cyan-500", desc: "Reviews PRs, finds bugs, security issues, and code smells.", reviews: 1284 },
  { id: "devops", name: "DevOps Agent", icon: Rocket, gradient: "from-purple-500 to-pink-500", desc: "Generates Dockerfiles, pipelines, and Kubernetes manifests.", reviews: 342 },
  { id: "architect", name: "Architect Agent", icon: Compass, gradient: "from-amber-500 to-orange-500", desc: "Designs architectures and recommends refactors.", reviews: 198 },
  { id: "docs", name: "Documentation Agent", icon: BookOpen, gradient: "from-emerald-500 to-teal-500", desc: "Writes READMEs, API docs, and inline comments.", reviews: 451 },
];

function AgentsPage() {
  const [open, setOpen] = useState<typeof agents[number] | null>(null);
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "agent"; text: string }[]>([
    { role: "agent", text: "Hi! I'm ready to help. What would you like to work on?" },
  ]);

  const send = () => {
    if (!input.trim()) return;
    setChat([...chat, { role: "user", text: input }, { role: "agent", text: "Got it — analyzing now…" }]);
    setInput("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Multi-agent"
        title="AI Agents"
        description="Specialized agents that collaborate on your codebase."
      />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
        {agents.map((a) => (
          <Card key={a.id} className="glass group relative cursor-pointer overflow-hidden p-5 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_-10px_var(--primary)]"
            onClick={() => { setOpen(a); setChat([{ role: "agent", text: `Hi! I'm the ${a.name}. ${a.desc}` }]); }}>
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${a.gradient} opacity-20 blur-2xl`} />
            <div className="relative">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${a.gradient} text-white shadow-lg`}>
                <a.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold">{a.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{a.desc}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_var(--color-success)]" />
                  <span className="font-medium text-emerald-400">Online</span>
                </span>
                <span className="text-xs text-muted-foreground">{a.reviews} runs</span>
              </div>
              <Button size="sm" variant="outline" className="mt-3 w-full">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />Chat
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl p-0 sm:max-w-2xl">
          {open && (
            <>
              <DialogHeader className="border-b border-border/60 p-4">
                <DialogTitle className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${open.gradient} text-white`}>
                    <open.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div>{open.name}</div>
                    <div className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-3">
                  {chat.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${m.role === "user" ? "bg-muted" : `bg-gradient-to-br ${open.gradient}`}`}>
                        {m.role === "user" ? <span className="text-[10px] font-bold">JD</span> : <Bot className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="border-t border-border/60 p-3">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={`Message ${open.name}…`}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                  <Button size="icon" onClick={send} className="h-7 w-7 bg-gradient-to-r from-primary to-accent">
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
