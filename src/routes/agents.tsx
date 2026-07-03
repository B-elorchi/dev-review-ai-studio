import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ShieldCheck, Rocket, Compass, BookOpen, Send, Sparkles, Bot, Plus,
  Settings, Trash2, X, Check, Loader2, Zap, Lock, Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchApi, API_BASE } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

export const Route = createFileRoute("/agents")({
  head: () => ({ meta: [{ title: "AI Agents — DevReview AI" }] }),
  component: AgentsPage,
});

// ─── Built-in agents ──────────────────────────────────────────────────────────

const BUILTIN: Agent[] = [
  { id: "code-review",  name: "Code Review",  icon: ShieldCheck, color: "from-blue-500 to-cyan-500",    tags: ["Bugs", "Anti-patterns"], description: "Senior engineer that reviews code for bugs, anti-patterns, edge cases and best practices using deep static analysis.", builtin: true },
  { id: "code-quality", name: "Code Quality", icon: Zap,         color: "from-purple-500 to-pink-500",  tags: ["SOLID", "Complexity"],   description: "Measures cyclomatic complexity, checks SOLID/DRY principles, and produces actionable refactor suggestions.", builtin: true },
  { id: "security",     name: "Security",     icon: Lock,         color: "from-rose-500 to-orange-500",  tags: ["OWASP", "CVE"],          description: "Scans for OWASP Top 10 vulnerabilities, secret exposure, dependency risks with CWE-mapped remediation.", builtin: true },
  { id: "dev",          name: "DevOps",        icon: Wrench,       color: "from-emerald-500 to-teal-500", tags: ["Docker", "CI/CD"],        description: "Reviews Dockerfiles, CI/CD pipelines, Kubernetes manifests, Terraform configs and IaC best practices.", builtin: true },
];

const ICON_OPTIONS = [
  { key: "bot",      Icon: Bot },
  { key: "sparkles", Icon: Sparkles },
  { key: "shield",   Icon: ShieldCheck },
  { key: "rocket",   Icon: Rocket },
  { key: "compass",  Icon: Compass },
  { key: "book",     Icon: BookOpen },
  { key: "zap",      Icon: Zap },
  { key: "lock",     Icon: Lock },
  { key: "wrench",   Icon: Wrench },
];

const COLORS = [
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-rose-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-yellow-500",
  "from-indigo-500 to-violet-500",
];

type Agent = {
  id: string; name: string; description?: string; system_prompt?: string;
  icon?: any; icon_key?: string; color?: string; tags?: string[]; builtin?: boolean;
};

function resolveIcon(a: Agent) {
  if (a.icon) return a.icon;
  return ICON_OPTIONS.find((o) => o.key === a.icon_key)?.Icon ?? Bot;
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({ agent, onChat, onEdit, onDelete }: {
  agent: Agent;
  onChat: (a: Agent) => void;
  onEdit?: (a: Agent) => void;
  onDelete?: (a: Agent) => void;
}) {
  const Icon = resolveIcon(agent);
  const color = agent.color ?? "from-primary to-accent";

  return (
    <Card className="glass group relative cursor-pointer overflow-hidden p-5 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_-10px_var(--primary)]">
      <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${color} opacity-20 blur-2xl`} />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1">
            {agent.builtin
              ? <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] text-primary">Built-in</Badge>
              : (
                <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {onEdit && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(agent); }}><Settings className="h-3.5 w-3.5" /></Button>}
                  {onDelete && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(agent); }}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              )
            }
          </div>
        </div>

        <h3 className="font-semibold">{agent.name}</h3>
        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
          {agent.description ?? agent.system_prompt?.slice(0, 120)}
        </p>

        {agent.tags && (
          <div className="mt-2 flex flex-wrap gap-1">
            {agent.tags.map((t) => (
              <span key={t} className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Online
          </span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onChat(agent)}>
            <Sparkles className="mr-1.5 h-3 w-3" />Chat
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Configure / Create dialog ────────────────────────────────────────────────

function ConfigDialog({ initial, onSave, onClose }: {
  initial?: Agent;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [name,    setName]   = useState(initial?.name ?? "");
  const [desc,    setDesc]   = useState(initial?.description ?? "");
  const [prompt,  setPrompt] = useState(initial?.system_prompt ?? "");
  const [iconKey, setIcon]   = useState(initial?.icon_key ?? "bot");
  const [color,   setColor]  = useState(initial?.color ?? COLORS[0]);
  const [saving,  setSaving] = useState(false);

  const PreviewIcon = ICON_OPTIONS.find((o) => o.key === iconKey)?.Icon ?? Bot;

  const submit = async () => {
    if (!name.trim() || !prompt.trim()) { toast.error("Name and system prompt are required"); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: desc.trim(), system_prompt: prompt.trim(), icon_key: iconKey, color });
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="border-b border-border/60 p-5">
          <DialogTitle>{initial?.id ? "Configure Agent" : "Create New Agent"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-5">
          {/* Live preview */}
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white`}>
              <PreviewIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">{name || "Agent name"}</div>
              <div className="text-xs text-muted-foreground">{desc || "Agent description"}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TypeScript Expert"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Description</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description shown on the card"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">System Prompt *</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={7}
              placeholder={"You are an expert TypeScript developer...\n\nWhen reviewing code:\n- Focus on type safety\n- Check for proper generics usage\n- Suggest modern patterns"}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
            <p className="text-[10px] text-muted-foreground">Defines the agent's persona, expertise and response style. The more detailed, the better the results.</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map(({ key, Icon }) => (
                  <button key={key} onClick={() => setIcon(key)} title={key}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border transition ${iconKey === key ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-muted/50"}`}>
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-lg bg-gradient-to-br ${c} transition ${color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-gradient-to-r from-primary to-accent">
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
            {initial?.id ? "Save changes" : "Create agent"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Chat Dialog ──────────────────────────────────────────────────────────────

function ChatDialog({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { workspaceId } = useAuthStore();
  const [chat,      setChat]      = useState<{ role: "user" | "agent"; text: string }[]>([
    { role: "agent", text: `Hi! I'm **${agent.name}**. ${agent.description ?? "How can I help?"}\n\nYou can paste code, ask questions, or request analysis.` },
  ]);
  const [input,     setInput]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef  = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || streaming) return;
    setInput("");
    setChat((c) => [...c, { role: "user", text }, { role: "agent", text: "" }]);
    setStreaming(true);

    const history = chat
      .filter((m) => m.role === "user")
      .map((m) => ({ role: "user" as const, content: m.text }));

    abortRef.current = new AbortController();

    try {
      const token = localStorage.getItem("token");

      // Built-in agents use /ai/inline-chat; custom agents use /agents/:id/run
      let url: string;
      let body: string;
      if (agent.builtin) {
        url  = `${API_BASE}/ai/inline-chat`;
        body = JSON.stringify({ agentType: agent.id, message: text, history });
      } else {
        url  = `${API_BASE}/agents/${agent.id}/run`;
        body = JSON.stringify({ input: text, history });
      }

      const resp = await fetch(url, {
        method: "POST",
        signal: abortRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-workspace-id": workspaceId ?? "",
        },
        body,
      });

      if (!resp.ok || !resp.body) throw new Error(`Request failed (${resp.status})`);

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "", acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data:")) {
            try {
              const d = JSON.parse(line.slice(5).trim());
              if (d.text) {
                acc += d.text;
                setChat((c) => { const n = [...c]; n[n.length - 1] = { role: "agent", text: acc }; return n; });
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setChat((c) => { const n = [...c]; n[n.length - 1] = { role: "agent", text: `Error: ${e.message}` }; return n; });
      }
    } finally {
      setStreaming(false);
    }
  };

  const Icon  = resolveIcon(agent);
  const color = agent.color ?? "from-primary to-accent";

  return (
    <Dialog open onOpenChange={(o) => { if (!o) { abortRef.current?.abort(); onClose(); } }}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 p-4">
          <DialogTitle className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">{agent.name}</div>
              <div className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                {!agent.builtin && <span>· Custom agent</span>}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {chat.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white ${m.role === "user" ? "bg-muted text-[10px] font-bold text-foreground" : `bg-gradient-to-br ${color}`}`}>
                  {m.role === "user" ? "ME" : <Icon className="h-3.5 w-3.5" />}
                </div>
                <div className={`max-w-[82%] rounded-lg px-3 py-2 text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
                  {m.text
                    ? <div className="prose prose-invert prose-sm max-w-none [&_pre]:max-h-60 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-[#0a0d18] [&_pre]:p-2 [&_pre]:text-xs">
                        <ReactMarkdown>{m.text}</ReactMarkdown>
                      </div>
                    : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  }
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Quick prompts */}
        {chat.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-4 py-2">
            {[
              "What can you help me with?",
              "Review this code for bugs",
              "Explain best practices",
              "Analyse my code",
            ].map((q) => (
              <button key={q} onClick={() => send(q)}
                className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted/50">
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="shrink-0 border-t border-border/60 p-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-primary/50">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={`Message ${agent.name}…`}
              disabled={streaming}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            {streaming
              ? <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => abortRef.current?.abort()}><X className="h-3 w-3" /></Button>
              : <Button size="icon" disabled={!input.trim()} onClick={() => send()} className={`h-7 w-7 shrink-0 bg-gradient-to-r ${color}`}><Send className="h-3 w-3" /></Button>
            }
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AgentsPage() {
  const { workspaceId } = useAuthStore();
  const [custom,   setCustom]   = useState<Agent[]>([]);
  const [chatWith, setChatWith] = useState<Agent | null>(null);
  const [editing,  setEditing]  = useState<Agent | null | "new">(null); // null=closed, "new"=create, Agent=edit

  useEffect(() => {
    if (!workspaceId) return;
    fetchApi("/agents", {}, workspaceId)
      .then((res) => setCustom((res?.agents ?? []).map((a: any) => ({ ...a, builtin: false }))))
      .catch(console.error);
  }, [workspaceId]);

  const handleSave = async (data: any) => {
    if (editing && editing !== "new" && (editing as Agent).id) {
      const agent = editing as Agent;
      await fetchApi(`/agents/${agent.id}`, { method: "PUT", body: JSON.stringify(data) }, workspaceId!);
      setCustom((prev) => prev.map((a) => a.id === agent.id ? { ...a, ...data, builtin: false } : a));
      toast.success("Agent updated");
    } else {
      const res = await fetchApi("/agents", { method: "POST", body: JSON.stringify(data) }, workspaceId!);
      setCustom((prev) => [...prev, { ...res.agent, builtin: false }]);
      toast.success("Agent created");
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Delete agent "${agent.name}"?`)) return;
    try {
      await fetchApi(`/agents/${agent.id}`, { method: "DELETE" }, workspaceId!);
      setCustom((prev) => prev.filter((a) => a.id !== agent.id));
      toast.success("Agent deleted");
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Multi-agent"
        title="AI Agents"
        description="Specialized agents with distinct expertise. Use built-in agents or create your own with custom system prompts."
        actions={
          <Button className="bg-gradient-to-r from-primary to-accent" onClick={() => setEditing("new")}>
            <Plus className="mr-1.5 h-4 w-4" />New agent
          </Button>
        }
      />

      {/* Built-in */}
      <div className="px-6 pb-2 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Built-in agents</p>
      </div>
      <div className="grid grid-cols-1 gap-4 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-4">
        {BUILTIN.map((a) => <AgentCard key={a.id} agent={a} onChat={setChatWith} />)}
      </div>

      {/* Custom */}
      <div className="px-6 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Custom agents {custom.length > 0 && <span className="ml-1 text-primary">({custom.length})</span>}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 px-6 pb-10 sm:grid-cols-2 xl:grid-cols-4">
        {custom.map((a) => (
          <AgentCard key={a.id} agent={a}
            onChat={setChatWith}
            onEdit={(ag) => setEditing(ag)}
            onDelete={handleDelete}
          />
        ))}
        <div
          onClick={() => setEditing("new")}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5"
        >
          <Plus className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm font-medium">New custom agent</p>
          <p className="mt-0.5 text-xs">Your own system prompt &amp; persona</p>
        </div>
      </div>

      {editing !== null && (
        <ConfigDialog
          initial={editing === "new" ? undefined : (editing as Agent)}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {chatWith && <ChatDialog agent={chatWith} onClose={() => setChatWith(null)} />}
    </div>
  );
}
