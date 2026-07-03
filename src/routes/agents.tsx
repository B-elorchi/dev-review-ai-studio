import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Rocket, Compass, BookOpen, Send, Sparkles, Bot, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchApi, API_BASE } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/agents")({
  head: () => ({ meta: [{ title: "AI Agents — DevReview AI" }] }),
  component: AgentsPage,
});

const iconMap: Record<string, any> = {
  review: ShieldCheck, devops: Rocket, architect: Compass, docs: BookOpen,
};
const gradientMap: Record<string, string> = {
  review: "from-blue-500 to-cyan-500", devops: "from-purple-500 to-pink-500",
  architect: "from-amber-500 to-orange-500", docs: "from-emerald-500 to-teal-500",
};

function AgentsPage() {
  const { workspaceId } = useAuthStore();
  const [agents, setAgents] = useState<any[]>([]);
  const [open, setOpen] = useState<any | null>(null);
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    fetchApi("/agents", {}, workspaceId)
      .then((res) => setAgents(res?.agents ?? []))
      .catch(console.error);
  }, [workspaceId]);

  const openAgent = (a: any) => {
    setOpen(a);
    setChat([{ role: "agent", text: `Hi! I'm the ${a.name}. ${a.system_prompt?.slice(0, 100) ?? "How can I help?"}` }]);
  };

  const send = () => {
    if (!input.trim() || streaming || !open) return;
    const text = input.trim();
    setInput("");
    setChat((c) => [...c, { role: "user", text }]);
    setStreaming(true);

    const token = localStorage.getItem("token");
    const es = new EventSource(
      `${API_BASE}/agents/${open.id}/run?input=${encodeURIComponent(text)}&token=${token}`,
    );
    esRef.current = es;
    let buf = "";

    setChat((c) => [...c, { role: "agent", text: "" }]);

    es.addEventListener("delta", (e) => {
      const { text: chunk } = JSON.parse(e.data);
      buf += chunk;
      setChat((c) => {
        const next = [...c];
        next[next.length - 1] = { role: "agent", text: buf };
        return next;
      });
    });
    es.addEventListener("session", () => {});
    es.onerror = () => { es.close(); setStreaming(false); };
    es.addEventListener("close", () => { es.close(); setStreaming(false); });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Multi-agent"
        title="AI Agents"
        description="Specialized agents that collaborate on your codebase."
        actions={
          <Button className="bg-gradient-to-r from-primary to-accent">
            <Plus className="mr-1.5 h-4 w-4" />New agent
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
        {agents.map((a) => {
          const Icon = iconMap[a.slug] ?? Bot;
          const gradient = gradientMap[a.slug] ?? "from-primary to-accent";
          return (
            <Card key={a.id} className="glass group relative cursor-pointer overflow-hidden p-5 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_-10px_var(--primary)]"
              onClick={() => openAgent(a)}>
              <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl`} />
              <div className="relative">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold">{a.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{a.system_prompt?.slice(0, 80) ?? ""}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    <span className="font-medium text-emerald-400">Online</span>
                  </span>
                </div>
                <Button size="sm" variant="outline" className="mt-3 w-full">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />Chat
                </Button>
              </div>
            </Card>
          );
        })}
        {agents.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
            <Bot className="mb-3 h-10 w-10 opacity-40" />
            <p>No agents yet. Create your first agent.</p>
          </div>
        )}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => { if (!o) { esRef.current?.close(); setOpen(null); } }}>
        <DialogContent className="max-w-2xl p-0 sm:max-w-2xl">
          {open && (
            <>
              <DialogHeader className="border-b border-border/60 p-4">
                <DialogTitle className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${gradientMap[open.slug] ?? "from-primary to-accent"} text-white`}>
                    {(() => { const Icon = iconMap[open.slug] ?? Bot; return <Icon className="h-4 w-4" />; })()}
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
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${m.role === "user" ? "bg-muted" : `bg-gradient-to-br ${gradientMap[open.slug] ?? "from-primary to-accent"}`}`}>
                        {m.role === "user" ? <span className="text-[10px] font-bold">ME</span> : <Bot className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
                        {m.text || <span className="animate-pulse">…</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="border-t border-border/60 p-3">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                  <input value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder={`Message ${open.name}…`}
                    disabled={streaming}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50" />
                  <Button size="icon" onClick={send} disabled={streaming} className="h-7 w-7 bg-gradient-to-r from-primary to-accent">
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
