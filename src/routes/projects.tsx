import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Plus, MoreHorizontal, Code2, Clock, Workflow, Trash2, ScanSearch,
  FolderOpen, Pencil, Github, Search, Lock, Unlock, Loader2, Send,
  Bot, Sparkles, FileCode, ChevronRight, Square, Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchApi, API_BASE } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — DevReview AI" }] }),
  component: ProjectsPage,
});

function scoreColor(s: number) {
  if (s >= 85) return "text-emerald-400";
  if (s >= 70) return "text-amber-400";
  return "text-rose-400";
}

type GhRepo = {
  id: string; name: string; language: string; stars: number;
  lastUpdated: string; private: boolean; url: string; clone_url: string;
};

type ChatMsg = { role: "user" | "ai"; text: string };
type GeneratedFile = { path: string; content: string };
type GeneratedProject = { name: string; description: string; techStack: string; files: GeneratedFile[] };

// Parse the last ```json ... ``` block in AI response
function parseProjectJson(text: string): GeneratedProject | null {
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

// ─── AI Architect Chat dialog component ───────────────────────────────────────

function ArchitectChat({ workspaceId, onCreated, onCancel }: {
  workspaceId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [chat, setChat] = useState<ChatMsg[]>([
    { role: "ai", text: "Hi! I'm your **AI Architect**. Tell me what kind of project you want to build — describe the purpose, tech stack preferences, and any requirements. I'll design the structure and generate the initial codebase for you." },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);
  const [previewFile, setPreviewFile] = useState<GeneratedFile | null>(null);
  const [repoName, setRepoName]   = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating]   = useState(false);
  const abortRef  = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const send = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || streaming) return;
    setInput("");
    const userMsg: ChatMsg = { role: "user", text };
    setChat((c) => [...c, userMsg]);
    setStreaming(true);
    setChat((c) => [...c, { role: "ai", text: "" }]);

    const history = [...chat, userMsg]
      .filter((m) => m.role === "user" || m.role === "ai")
      .map((m) => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.text }));

    abortRef.current = new AbortController();
    let full = "";
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/ai/architect/chat`, {
        method: "POST",
        signal: abortRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({ message: text, history }),
      });

      if (!resp.ok || !resp.body) throw new Error("Stream failed");
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data:")) {
            try {
              const d = JSON.parse(line.slice(5).trim());
              if (d.text) {
                full += d.text;
                setChat((c) => {
                  const next = [...c];
                  next[next.length - 1] = { role: "ai", text: full };
                  return next;
                });
              }
            } catch {}
          }
        }
      }
      // After stream ends, check if AI generated a project JSON
      const parsed = parseProjectJson(full);
      if (parsed) {
        setGeneratedProject(parsed);
        setRepoName(parsed.name);
        setPreviewFile(parsed.files[0] ?? null);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setChat((c) => { const n = [...c]; n[n.length - 1] = { role: "ai", text: "Something went wrong. Please try again." }; return n; });
      }
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, chat, workspaceId]);

  const createProject = async () => {
    if (!generatedProject || !repoName.trim()) return;
    setCreating(true);
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/ai/architect/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          repoName: repoName.trim(),
          description: generatedProject.description,
          isPrivate,
          files: generatedProject.files,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Failed to create project");
      const pushed = data.pushResults?.filter((r: any) => r.ok).length ?? 0;
      toast.success(`"${repoName}" created on GitHub with ${pushed} files pushed as v0 🚀`);
      onCreated();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const PROJECT_STARTERS = [
    "Build a REST API with Node.js + TypeScript + Express",
    "Create a Next.js web app with Tailwind CSS and Supabase",
    "Build a Python FastAPI service with PostgreSQL",
    "Create a React Native mobile app",
    "Build a CLI tool with Node.js and Commander",
    "Create a Docker + Kubernetes microservice",
  ];

  // If AI has generated a project, show preview + create panel
  if (generatedProject) {
    return (
      <div className="flex h-[520px] flex-col">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          <Check className="h-4 w-4 shrink-0" />
          <span>AI generated <strong>{generatedProject.files.length} files</strong> · {generatedProject.techStack}</span>
        </div>

        <div className="flex flex-1 gap-3 overflow-hidden">
          {/* File list */}
          <div className="flex w-44 shrink-0 flex-col rounded-lg border border-border bg-muted/20">
            <div className="border-b border-border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Files ({generatedProject.files.length})
            </div>
            <ScrollArea className="flex-1">
              {generatedProject.files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => setPreviewFile(f)}
                  className={`flex w-full items-center gap-1.5 border-b border-border/40 px-2 py-1.5 text-left text-[11px] last:border-0 hover:bg-muted/40 ${previewFile?.path === f.path ? "bg-primary/10 text-primary" : ""}`}
                >
                  <FileCode className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{f.path}</span>
                </button>
              ))}
            </ScrollArea>
          </div>

          {/* File preview */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-[#0e1320]">
            <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
              <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-xs text-muted-foreground">{previewFile?.path ?? "—"}</span>
            </div>
            <ScrollArea className="flex-1 p-3">
              <pre className="font-mono text-[11px] text-foreground/80 leading-relaxed whitespace-pre-wrap break-all">
                {previewFile?.content ?? ""}
              </pre>
            </ScrollArea>
          </div>
        </div>

        {/* Repo settings + create */}
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Repository name</Label>
              <Input
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="my-project"
                className="h-8 text-sm"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 pt-5 text-xs text-muted-foreground">
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="h-3.5 w-3.5" />
              <Lock className="h-3 w-3" />Private
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setGeneratedProject(null)}>
              ← Edit plan
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-primary to-accent"
              disabled={!repoName.trim() || creating}
              onClick={createProject}
            >
              {creating
                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Creating…</>
                : <><Github className="mr-1.5 h-3.5 w-3.5" />Create & push to GitHub</>}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[520px] flex-col">
      {/* Quick starters */}
      {chat.length <= 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PROJECT_STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={streaming}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Chat messages */}
      <ScrollArea className="flex-1 rounded-lg border border-border bg-muted/10 p-3">
        <div className="space-y-3">
          {chat.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${m.role === "user" ? "bg-muted text-[9px] font-bold" : "bg-gradient-to-br from-primary to-accent text-white"}`}>
                {m.role === "user" ? "ME" : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
                <div className="prose prose-invert prose-xs max-w-none [&_code]:text-[11px] [&_p]:my-0.5 [&_pre]:my-1 [&_pre]:max-h-32 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-[#0a0d18] [&_pre]:p-2 [&_pre]:text-[10px]">
                  <ReactMarkdown>{m.text || (streaming && i === chat.length - 1 ? "▍" : "")}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Generate shortcut */}
      {chat.length > 2 && !streaming && (
        <button
          onClick={() => send("I'm ready. Generate the complete project structure now with all files.")}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 py-1.5 text-xs text-primary hover:bg-primary/15"
        >
          <Sparkles className="h-3 w-3" />Generate project files
        </button>
      )}

      {/* Input */}
      <div className="mt-2 flex items-end gap-2 rounded-lg border border-border bg-background p-2 focus-within:border-primary/50">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Describe your project… (Enter to send)"
          className="max-h-20 min-h-[36px] flex-1 resize-none bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
        {streaming
          ? <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => abortRef.current?.abort()}><Square className="h-3 w-3" /></Button>
          : <Button size="icon" className="h-7 w-7 shrink-0 bg-gradient-to-r from-primary to-accent" disabled={!input.trim()} onClick={() => send()}><Send className="h-3 w-3" /></Button>}
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

function ProjectsPage() {
  const navigate = useNavigate();
  const { workspaceId } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"link" | "new">("link");

  // Link existing GitHub repo
  const [ghRepos, setGhRepos] = useState<GhRepo[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghSearch, setGhSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GhRepo | null>(null);

  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!workspaceId) return;
    try {
      const data = await fetchApi("/projects", {}, workspaceId);
      setProjects(Array.isArray(data) ? data : data.projects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [workspaceId]);

  const openCreate = async () => {
    setCreateTab("link");
    setSelectedRepo(null);
    setGhSearch("");
    setCreateOpen(true);
    // Pre-fetch GitHub repos
    setGhLoading(true);
    try {
      const data = await fetchApi("/integrations/github/repos", {}, workspaceId ?? undefined);
      setGhRepos(data.repos ?? []);
    } catch {
      setGhRepos([]);
    } finally {
      setGhLoading(false);
    }
  };

  const filteredRepos = ghRepos.filter((r) =>
    r.name.toLowerCase().includes(ghSearch.toLowerCase())
  );

  const saveByLinking = async () => {
    if (!selectedRepo || !workspaceId) return;
    setSaving(true);
    try {
      await fetchApi("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: selectedRepo.name.split("/").pop(),
          repo_url: selectedRepo.url,
          description: `Linked from GitHub: ${selectedRepo.name}`,
        }),
      }, workspaceId);
      toast.success("Project linked from GitHub");
      setCreateOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to link project");
    } finally {
      setSaving(false);
    }
  };


  const openEdit = (p: any) => {
    setEditTarget(p);
    setEditForm({ name: p.name ?? "", description: p.description ?? "" });
  };

  const saveEdit = async () => {
    if (!editTarget || !workspaceId) return;
    setEditSaving(true);
    try {
      await fetchApi(`/projects/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      }, workspaceId);
      toast.success("Project updated");
      setEditTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update");
    } finally {
      setEditSaving(false);
    }
  };

  const deleteProject = async () => {
    if (!deleteTarget || !workspaceId) return;
    setDeleting(true);
    try {
      await fetchApi(`/projects/${deleteTarget.id}`, { method: "DELETE" }, workspaceId);
      toast.success("Project deleted");
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="All repositories analyzed by DevReview AI."
        actions={
          <Button
            size="sm"
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
            onClick={openCreate}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add project
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <Card
            key={p.id}
            className="glass group relative overflow-hidden p-5 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_-10px_var(--primary)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.repo_url || "No repo URL"}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/projects/$id" params={{ id: p.id }}>
                      <FolderOpen className="mr-2 h-3.5 w-3.5" />Open
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(p)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/code-review", search: { projectId: p.id } })}>
                    <ScanSearch className="mr-2 h-3.5 w-3.5" />Review
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/devops">
                      <Workflow className="mr-2 h-3.5 w-3.5" />Generate DevOps
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(p)}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {p.description || "No description provided."}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Score</span>
                <span className={`font-display text-lg font-bold ${scoreColor(p.health_score ?? 0)}`}>
                  {p.health_score ?? "N/A"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <Link to="/projects/$id" params={{ id: p.id }}>Open</Link>
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-primary/15 text-primary hover:bg-primary/25"
                onClick={() => navigate({ to: "/code-review", search: { projectId: p.id } })}
              >
                Review
              </Button>
            </div>
          </Card>
        ))}

        {!loading && projects.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-20 text-center">
            <Code2 className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-muted-foreground">No projects yet. Add your first one.</p>
            <Button className="mt-4 bg-gradient-to-r from-primary to-accent" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />Add project
            </Button>
          </div>
        )}
      </div>

      {/* Create dialog — two modes */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={createTab === "new" ? "sm:max-w-3xl" : "sm:max-w-lg"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              Add project from GitHub
            </DialogTitle>
          </DialogHeader>

          <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as "link" | "new")}>
            <TabsList className="w-full">
              <TabsTrigger value="link" className="flex-1">Link existing repo</TabsTrigger>
              <TabsTrigger value="new" className="flex-1 gap-1.5"><Sparkles className="h-3.5 w-3.5" />Build with AI</TabsTrigger>
            </TabsList>

            {/* Tab 1: link an existing GitHub repo */}
            <TabsContent value="link" className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search your repositories…"
                  value={ghSearch}
                  onChange={(e) => setGhSearch(e.target.value)}
                />
              </div>

              <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                {ghLoading && (
                  <div className="flex items-center justify-center p-8 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading repos…
                  </div>
                )}
                {!ghLoading && filteredRepos.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No repositories found.{!ghRepos.length && " Add GITHUB_TOKEN to your server .env to load repos."}
                  </div>
                )}
                {filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo.id === selectedRepo?.id ? null : repo)}
                    className={`flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left text-sm last:border-0 hover:bg-muted/40 ${
                      selectedRepo?.id === repo.id ? "bg-primary/10" : ""
                    }`}
                  >
                    {repo.private ? <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <Unlock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    <span className="flex-1 font-medium">{repo.name}</span>
                    <span className="text-xs text-muted-foreground">{repo.language}</span>
                  </button>
                ))}
              </div>

              {selectedRepo && (
                <p className="text-xs text-muted-foreground">
                  Selected: <span className="text-foreground font-medium">{selectedRepo.name}</span> — will be added as a DevReview project.
                </p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  className="bg-gradient-to-r from-primary to-accent"
                  disabled={!selectedRepo || saving}
                  onClick={saveByLinking}
                >
                  {saving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Linking…</> : "Link repo"}
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* Tab 2: AI architect → generate files → push to GitHub */}
            <TabsContent value="new" className="mt-4">
              {workspaceId && (
                <ArchitectChat
                  workspaceId={workspaceId}
                  onCreated={() => { setCreateOpen(false); load(); }}
                  onCancel={() => setCreateOpen(false)}
                />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-primary to-accent"
              disabled={editSaving || !editForm.name.trim()}
              onClick={saveEdit}
            >
              {editSaving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its reviews and findings. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteProject}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
