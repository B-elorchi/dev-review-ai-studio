import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen, X, Terminal as TerminalIcon,
  Send, Bot, Shield, Zap, Lock, Wrench, ArrowLeft, Play, GitCommit,
  ChevronDown as ChevDown, Loader2, Circle,
  Container, Boxes, Workflow, Cloud, FolderDown, Copy, CheckCircle2,
} from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CodeEditor } from "@/components/code-editor";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApi, API_BASE } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({ meta: [{ title: "Workspace — DevReview AI" }] }),
  component: Workspace,
});

// ─── types ────────────────────────────────────────────────────────────────────

type FNode = {
  name: string; type: "file" | "folder";
  lang?: string; content?: string; children?: FNode[];
};

type Tab = { path: string; lang: string };
type ChatMsg = { role: "user" | "agent"; text: string };
type AgentType = "code-review" | "code-quality" | "security" | "dev" | "devops";

const AGENTS: { id: AgentType; label: string; icon: any; color: string; placeholder: string }[] = [
  { id: "code-review", label: "Code Review", icon: Shield, color: "from-blue-500 to-cyan-500", placeholder: "Ask about bugs, anti-patterns, edge cases…" },
  { id: "code-quality", label: "Quality", icon: Zap, color: "from-purple-500 to-pink-500", placeholder: "Ask about complexity, maintainability, SOLID…" },
  { id: "security", label: "Security", icon: Lock, color: "from-rose-500 to-orange-500", placeholder: "Ask about vulnerabilities, OWASP, secrets…" },
  { id: "dev", label: "DevOps", icon: Wrench, color: "from-emerald-500 to-teal-500", placeholder: "Ask about Docker, CI/CD, Kubernetes, IaC…" },
  { id: "devops", label: "Generate", icon: Container, color: "from-rose-500 to-pink-600", placeholder: "" },
];

// ─── file tree component ──────────────────────────────────────────────────────

function FileTreeNode({
  node, depth, parentPath, onOpen, active, isDirty,
}: {
  node: FNode; depth: number; parentPath: string;
  onOpen: (path: string, lang: string, content: string) => void;
  active: string; isDirty: (path: string) => boolean;
}) {
  const [open, setOpen] = useState(depth < 1);
  const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-1 rounded px-2 py-0.5 text-sm hover:bg-muted/50"
          style={{ paddingLeft: depth * 12 + 8 }}
        >
          {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          {open ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children?.map((c) => (
          <FileTreeNode key={c.name} node={c} depth={depth + 1} parentPath={fullPath} onOpen={onOpen} active={active} isDirty={isDirty} />
        ))}
      </div>
    );
  }

  const dirty = isDirty(fullPath);
  return (
    <button
      onClick={() => onOpen(fullPath, node.lang ?? "plaintext", node.content ?? "")}
      className={`flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-sm hover:bg-muted/50 ${active === fullPath ? "bg-primary/15 text-primary" : ""}`}
      style={{ paddingLeft: depth * 12 + 20 }}
    >
      <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-left">{node.name}</span>
      {dirty && <Circle className="h-2 w-2 shrink-0 fill-amber-400 text-amber-400" />}
    </button>
  );
}

// ─── agent chat panel ─────────────────────────────────────────────────────────

function AgentChat({
  agentDef, fileContent, fileName, workspaceId,
}: {
  agentDef: typeof AGENTS[number];
  fileContent: string; fileName: string; workspaceId: string;
}) {
  const [chat, setChat] = useState<ChatMsg[]>([
    { role: "agent", text: `Hi! I'm your ${agentDef.label} agent. Share the current file or ask me anything about it.` },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setChat((c) => [...c, { role: "user", text }]);
    setStreaming(true);

    const history = chat
      .filter((m) => m.text) // skip placeholder
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant" as const, content: m.text }));

    abortRef.current = new AbortController();
    setChat((c) => [...c, { role: "agent", text: "" }]);

    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/ai/inline-chat`, {
        method: "POST",
        signal: abortRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          agentType: agentDef.id,
          message: text,
          fileName,
          fileContent,
          history,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Stream failed");
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

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
                setChat((c) => {
                  const next = [...c];
                  next[next.length - 1] = { role: "agent", text: next[next.length - 1].text + d.text };
                  return next;
                });
              }
            } catch { }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setChat((c) => {
          const next = [...c];
          next[next.length - 1] = { role: "agent", text: "Sorry, something went wrong. Please try again." };
          return next;
        });
      }
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, chat, agentDef.id, fileContent, fileName, workspaceId]);

  const Icon = agentDef.icon;

  return (
    <div className="flex h-full flex-col">
      {/* Agent header */}
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${agentDef.color} text-white shadow-lg`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">{agentDef.label} Agent</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {fileName ? `Analyzing ${fileName.split("/").pop()}` : "Online"}
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {chat.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${m.role === "user" ? "bg-muted" : `bg-gradient-to-br ${agentDef.color} text-white`}`}>
                {m.role === "user" ? "ME" : <Bot className="h-3 w-3" />}
              </div>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
                {m.text || <span className="animate-pulse opacity-60">…</span>}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={agentDef.placeholder}
            disabled={streaming}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          {streaming ? (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abortRef.current?.abort()}>
              <Loader2 className="h-3 w-3 animate-spin" />
            </Button>
          ) : (
            <Button size="icon" onClick={send} className={`h-7 w-7 bg-gradient-to-r ${agentDef.color}`}>
              <Send className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


type DevOpsFile = { lang: string; content: string };
type DevOpsGenerated = Record<string, DevOpsFile>;

const DEVOPS_FILE_ICONS: Record<string, any> = {
  Dockerfile: Container,
  "docker-compose.yml": Boxes,
  ".github/workflows/ci.yml": Workflow,
  "k8s/deployment.yaml": Cloud,
  "k8s/service.yaml": Cloud,
};

function DevOpsPanel({
  projectId, projectRepoUrl, workspaceId,
}: {
  projectId: string;
  projectRepoUrl?: string;
  workspaceId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<DevOpsGenerated>({});
  const [active, setActive] = useState("");
  const [pushing, setPushing] = useState(false);
  const [commitMsg, setCommitMsg] = useState("chore: add AI-generated DevOps configuration");
  const [logLines, setLogLines] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const hasRepo = !!projectRepoUrl;
  const hasFiles = Object.keys(generated).length > 0;

  useEffect(() => {
    logRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logLines]);

  const handleGenerate = async () => {
    setLoading(true);
    setGenerated({});
    setLogLines([]);
    abortRef.current = new AbortController();

    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/devops/generate`, {
        method: "POST",
        signal: abortRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          projectId,
          targets: ["dockerfile", "docker-compose", "github-actions"],
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Stream failed");
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let deltaBuffer = "";

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
              if (d.text !== undefined) {
                deltaBuffer += d.text;
                const visible = deltaBuffer.split("\n").filter((l) => l.trim().length > 0);
                setLogLines(visible.slice(-15));
              }
              if (d.generated) {
                const files = d.generated as DevOpsGenerated;
                setGenerated(files);
                const first = Object.keys(files)[0] ?? "";
                setActive(first);
                toast.success(`Generated ${Object.keys(files).length} DevOps file(s)!`);
              }
            } catch { }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") toast.error("Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const file = generated[active];
    if (!file) return;
    navigator.clipboard.writeText(file.content);
    toast.success("Copied to clipboard");
  };

  const handleDownload = () => {
    Object.entries(generated).forEach(([name, file]) => {
      const blob = new Blob([file.content], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name.split("/").pop() ?? name;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    toast.success(`Downloaded ${Object.keys(generated).length} file(s)`);
  };

  const handlePush = async () => {
    if (!hasRepo || !commitMsg.trim()) return;
    setPushing(true);
    try {
      const files = Object.entries(generated).map(([path, f]) => ({ path, content: f.content }));
      const result = await fetchApi("/devops/push", {
        method: "POST",
        body: JSON.stringify({ projectId, files, message: commitMsg }),
      }, workspaceId);
      const failed = (result.results ?? []).filter((r: any) => r.status === "failed");
      if (failed.length === 0) {
        toast.success(`Pushed ${files.length} file(s) to ${result.branch}`);
      } else {
        toast.error(`${failed.length} file(s) failed to push`);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Push failed");
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg">
          <Container className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">DevOps Generator</div>
          <div className="text-xs text-muted-foreground">
            {hasRepo ? "GitHub repo detected — AI uses your file tree" : "No GitHub repo linked"}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Generate button */}
        {!hasFiles && !loading && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Click below to generate a <strong>Dockerfile</strong>, <strong>docker-compose.yml</strong>, and <strong>GitHub Actions CI/CD</strong> workflow tailored to this project's tech stack.
              {hasRepo && " Your repository files will be used as context for better accuracy."}
            </p>
            <Button
              id="devops-generate-btn"
              className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg gap-2"
              onClick={handleGenerate}
            >
              <Container className="h-4 w-4" />
              Generate DevOps Configs
            </Button>
          </div>
        )}

        {/* Streaming log */}
        {loading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              AI is generating DevOps configuration…
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border/60 bg-[#0e1320] p-3 font-mono text-[10px]">
              {logLines.map((l, i) => (
                <div key={i} className="text-emerald-400 leading-relaxed">{l}</div>
              ))}
              <div ref={logRef} />
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { abortRef.current?.abort(); setLoading(false); }}>
              Cancel
            </Button>
          </div>
        )}

        {/* Generated file list */}
        {hasFiles && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {Object.keys(generated).length} files generated
            </div>
            {Object.keys(generated).map((name) => {
              const Icon = DEVOPS_FILE_ICONS[name] ?? File;
              return (
                <button
                  key={name}
                  onClick={() => setActive(name)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors hover:bg-muted/50
                    ${active === name ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate text-left font-mono">{name}</span>
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                </button>
              );
            })}

            {/* Actions */}
            <div className="flex gap-1.5 pt-1">
              <Button id="devops-copy-btn" variant="outline" size="sm" className="flex-1 h-7 gap-1 text-[11px]" onClick={handleCopy}>
                <Copy className="h-3 w-3" />Copy
              </Button>
              <Button id="devops-download-btn" variant="outline" size="sm" className="flex-1 h-7 gap-1 text-[11px]" onClick={handleDownload}>
                <FolderDown className="h-3 w-3" />Download
              </Button>
            </div>

            {/* Push to GitHub */}
            {hasRepo && (
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <input
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                  placeholder="Commit message…"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                />
                <Button
                  id="devops-push-btn"
                  size="sm"
                  className="w-full h-7 bg-gradient-to-r from-primary to-accent text-xs gap-1.5"
                  onClick={handlePush}
                  disabled={pushing || !commitMsg.trim()}
                >
                  {pushing ? <><Loader2 className="h-3 w-3 animate-spin" />Pushing…</> : <><GitCommit className="h-3 w-3" />Push to GitHub</>}
                </Button>
              </div>
            )}

            {!hasRepo && (
              <p className="text-[10px] text-muted-foreground text-center py-1">
                Link a GitHub repo to enable push
              </p>
            )}

            <Button
              id="devops-regenerate-btn"
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={handleGenerate}
              disabled={loading}
            >
              ↺ Regenerate
            </Button>
          </div>
        )}
      </div>

      {hasFiles && active && generated[active] && (
        <div className="border-t border-border/60">
          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-muted-foreground">
            <span className="font-mono">{active}</span>
            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2" onClick={handleCopy}>
              <Copy className="h-2.5 w-2.5 mr-1" />copy
            </Button>
          </div>
          <div className="h-40 border-t border-border/30">
            <CodeEditor value={generated[active].content} language={generated[active].lang} readOnly />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main workspace ───────────────────────────────────────────────────────────

function Workspace() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { workspaceId } = useAuthStore();

  // Projects list for selector
  const [projects, setProjects] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);

  // File tree & editor state
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [active, setActive] = useState("");
  const [sampleFiles, setSampleFiles] = useState<Record<string, { lang: string; content: string }>>({});
  const [fileTree, setFileTree] = useState<FNode[]>([]);
  const [edits, setEdits] = useState<Map<string, string>>(new Map()); // path → edited content
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [fileSource, setFileSource] = useState<"github" | "static">("static"); // whether files came from GitHub
  const [fetchingFile, setFetchingFile] = useState(false); // fetching individual file on click

  // Agent
  const [agentTab, setAgentTab] = useState<AgentType>("code-review");

  // Bottom panel
  const [bottomTab, setBottomTab] = useState("terminal");

  // Push dialog
  const [pushOpen, setPushOpen] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [pushing, setPushing] = useState(false);

  // Load all workspace projects for the project selector
  useEffect(() => {
    if (!workspaceId) return;
    fetchApi("/projects", {}, workspaceId)
      .then((d) => setProjects(d.projects ?? []))
      .catch(console.error);
  }, [workspaceId]);

  // Load current project + its files
  useEffect(() => {
    if (!workspaceId) return;
    setLoadingFiles(true);
    setEdits(new Map());
    setTabs([]);
    setActive("");

    Promise.all([
      fetchApi(`/projects/${id}`, {}, workspaceId),
      fetchApi(`/projects/${id}/files`, {}, workspaceId),
    ]).then(([pData, fData]) => {
      setProject(pData.project ?? null);
      const tree: FNode[] = fData.fileTree ?? [];
      const samples: Record<string, { lang: string; content: string }> = fData.sampleFiles ?? {};
      setFileTree(tree);
      setSampleFiles(samples);
      setFileSource(fData.source === "github" ? "github" : "static");

      // Auto-open the first file that has content
      const firstPath = Object.keys(samples)[0];
      if (firstPath) {
        setTabs([{ path: firstPath, lang: samples[firstPath].lang }]);
        setActive(firstPath);
      }
    }).catch(console.error)
      .finally(() => setLoadingFiles(false));
  }, [id, workspaceId]);

  const isDirty = useCallback((path: string) => edits.has(path), [edits]);

  const dirtyFiles = Array.from(edits.entries()).map(([path, content]) => ({ path, content }));

  const openFile = async (path: string, lang: string, content: string) => {
    if (!tabs.find((t) => t.path === path)) setTabs((ts) => [...ts, { path, lang }]);
    setActive(path);

    // If content already known (from sampleFiles or a prior load), use it directly
    if (sampleFiles[path] || content) {
      if (!sampleFiles[path]) setSampleFiles((sf) => ({ ...sf, [path]: { lang, content } }));
      return;
    }

    // Content not pre-loaded — fetch from backend (backend proxies to GitHub)
    setFetchingFile(true);
    try {
      const data = await fetchApi(`/projects/${id}/files/${encodeURIComponent(path)}`, {}, workspaceId ?? undefined);
      const fileContent: string = data.content ?? "// Could not load file content";
      const fileLang: string = data.lang ?? lang;
      setSampleFiles((sf) => ({ ...sf, [path]: { lang: fileLang, content: fileContent } }));
    } catch {
      setSampleFiles((sf) => ({ ...sf, [path]: { lang, content: `// Failed to load ${path}` } }));
    } finally {
      setFetchingFile(false);
    }
  };

  const closeTab = (path: string) => {
    const next = tabs.filter((t) => t.path !== path);
    setTabs(next);
    if (active === path && next.length) setActive(next[0].path);
  };

  const currentFile = sampleFiles[active];
  // initialContent is what Monaco uses as defaultValue on mount (keyed by `active`).
  // We intentionally do NOT feed edits back as value — that would reset the cursor.
  const initialContent = edits.has(active) ? edits.get(active)! : (currentFile?.content ?? "");
  const currentLang = currentFile?.lang ?? "typescript";

  const onEdit = (value: string) => {
    const original = sampleFiles[active]?.content ?? "";
    if (value === original) {
      setEdits((m) => { const n = new Map(m); n.delete(active); return n; });
    } else {
      setEdits((m) => new Map(m).set(active, value));
    }
  };

  const canPush = !!project?.repo_url && fileSource === "github";

  const pushChanges = async () => {
    if (!commitMsg.trim() || dirtyFiles.length === 0 || !workspaceId) return;
    setPushing(true);
    try {
      const result = await fetchApi(`/projects/${id}/push`, {
        method: "POST",
        body: JSON.stringify({ message: commitMsg, files: dirtyFiles }),
      }, workspaceId);
      const failed = (result.results ?? []).filter((r: any) => r.status === "failed");
      if (failed.length === 0) {
        toast.success(`Pushed ${dirtyFiles.length} file${dirtyFiles.length > 1 ? "s" : ""} to ${result.branch}`);
        setEdits((m) => { const n = new Map(m); dirtyFiles.forEach((f) => n.delete(f.path)); return n; });
        setSampleFiles((sf) => {
          const n = { ...sf };
          dirtyFiles.forEach((f) => { if (n[f.path]) n[f.path] = { ...n[f.path], content: f.content }; });
          return n;
        });
        setPushOpen(false);
        setCommitMsg("");
      } else {
        toast.error(`${failed.length} file(s) failed to push`);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Push failed");
    } finally {
      setPushing(false);
    }
  };

  // Download all dirty files as a zip-like text bundle (fallback when no GitHub)
  const downloadChanges = () => {
    const lines: string[] = [`# Changes — ${project?.name ?? id}`, `# ${new Date().toISOString()}`, ""];
    dirtyFiles.forEach((f) => {
      lines.push(`\n${"=".repeat(60)}`);
      lines.push(`# FILE: ${f.path}`);
      lines.push("=".repeat(60));
      lines.push(f.content);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `changes-${id}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Changes downloaded");
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link to="/projects"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>

          {/* Project selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                {project?.name ?? "Loading…"}
                <ChevDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {projects.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  className={p.id === id ? "bg-primary/10 font-medium" : ""}
                  onClick={() => navigate({ to: "/projects/$id", params: { id: p.id } })}
                >
                  {p.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">main</span>

          {dirtyFiles.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">
              {dirtyFiles.length} unsaved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            onClick={() => navigate({ to: "/code-review", search: { projectId: id } })}
          >
            <Play className="h-3 w-3" />Run review
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 bg-gradient-to-r from-primary to-accent text-xs text-primary-foreground disabled:opacity-50"
            disabled={dirtyFiles.length === 0}
            onClick={() => setPushOpen(true)}
          >
            <GitCommit className="h-3 w-3" />
            Commit & Push {dirtyFiles.length > 0 && `(${dirtyFiles.length})`}
          </Button>
        </div>
      </div>

      {/* Static files banner */}
      {fileSource === "static" && (
        <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-400">
          <span className="font-semibold">Demo files</span>
          <span className="text-amber-400/70">·</span>
          <span>These are placeholder files. Add <code className="rounded bg-amber-500/20 px-1">GITHUB_TOKEN</code> to the server <code className="rounded bg-amber-500/20 px-1">.env</code> and link a GitHub repo to load real files.</span>
        </div>
      )}

      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* File explorer */}
        <ResizablePanel defaultSize={18} minSize={12}>
          <div className="flex h-full flex-col border-r border-border/60 bg-sidebar/50">
            <div className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Explorer
            </div>
            <ScrollArea className="flex-1 p-1">
              {loadingFiles ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                fileTree.map((n) => (
                  <FileTreeNode
                    key={n.name} node={n} depth={0} parentPath=""
                    onOpen={openFile} active={active} isDirty={isDirty}
                  />
                ))
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>
        <ResizableHandle />

        {/* Editor + terminal */}
        <ResizablePanel defaultSize={52}>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel defaultSize={70}>
              <div className="flex h-full flex-col bg-[#0e1320]">
                {/* Tab bar */}
                <div className="flex h-9 items-center gap-0.5 overflow-x-auto border-b border-border/60 bg-background/40 px-1">
                  {tabs.map((t) => (
                    <button
                      key={t.path}
                      onClick={() => setActive(t.path)}
                      className={`group flex h-7 items-center gap-1.5 rounded-t px-3 text-xs transition-colors ${active === t.path ? "bg-[#0e1320] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <File className="h-3 w-3 shrink-0" />
                      <span>{t.path.split("/").pop()}</span>
                      {isDirty(t.path) && <Circle className="h-1.5 w-1.5 fill-amber-400 text-amber-400" />}
                      <X
                        className="h-3 w-3 opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); closeTab(t.path); }}
                      />
                    </button>
                  ))}
                  {tabs.length === 0 && !loadingFiles && (
                    <span className="px-3 text-xs text-muted-foreground">Click a file to open it</span>
                  )}
                </div>

                {/* Monaco editor — editable */}
                <div className="flex-1 relative">
                  {fetchingFile && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0e1320]/80">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                  {active && currentFile ? (
                    // key={active} remounts Monaco on file switch so defaultValue resets correctly.
                    // defaultValue (not value) prevents cursor resets while editing.
                    <CodeEditor
                      key={active}
                      defaultValue={initialContent}
                      language={currentLang}
                      onChange={onEdit}
                    />
                  ) : active && !currentFile ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading file…
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Select a file from the explorer
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle />

            {/* Bottom panel */}
            <ResizablePanel defaultSize={30} minSize={15}>
              <Tabs value={bottomTab} onValueChange={setBottomTab} className="flex h-full flex-col">
                <TabsList className="h-9 w-full justify-start rounded-none border-b border-border/60 bg-transparent px-2">
                  <TabsTrigger value="terminal" className="gap-1.5 data-[state=active]:bg-muted/50">
                    <TerminalIcon className="h-3 w-3" />Terminal
                  </TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="build">Build</TabsTrigger>
                </TabsList>
                <TabsContent value="terminal" className="flex-1 overflow-auto p-3 font-mono text-xs">
                  <div className="text-muted-foreground">$ npm run dev</div>
                  <div className="text-emerald-400">✓ Compiled in 1.2s</div>
                  <div className="text-sky-400">▶ Listening on :3000</div>
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-primary">{project?.name ?? "app"}@main</span>
                    <span className="text-muted-foreground">$</span>
                    <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-primary" />
                  </div>
                </TabsContent>
                <TabsContent value="logs" className="flex-1 overflow-auto p-3 font-mono text-xs text-muted-foreground">
                  <div>[INFO] Server started</div>
                  <div>[INFO] GET /health 200 4ms</div>
                  <div>[WARN] Rate limit threshold reached</div>
                </TabsContent>
                <TabsContent value="build" className="flex-1 overflow-auto p-3 font-mono text-xs">
                  <div className="text-emerald-400">✓ Build completed in 4.7s</div>
                  <div className="text-muted-foreground">Bundle: 142 KB gzip</div>
                </TabsContent>
              </Tabs>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle />

        {/* Agent panel */}
        <ResizablePanel defaultSize={30} minSize={22}>
          <div className="flex h-full flex-col border-l border-border/60 bg-sidebar/50">
            <Tabs value={agentTab} onValueChange={(v) => setAgentTab(v as AgentType)} className="flex h-full flex-col">
              <div className="border-b border-border/60 p-2">
                <TabsList className="grid w-full grid-cols-5 bg-muted/30">
                  {AGENTS.map((a) => (
                    <TabsTrigger key={a.id} value={a.id} className="gap-1 text-[11px]">
                      <a.icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{a.label.split(" ")[0]}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {workspaceId && AGENTS.filter((a) => a.id !== "devops").map((a) => (
                <TabsContent key={a.id} value={a.id} className="m-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
                  <AgentChat
                    agentDef={a}
                    fileContent={initialContent}
                    fileName={active}
                    workspaceId={workspaceId}
                  />
                </TabsContent>
              ))}
              {workspaceId && (
                <TabsContent value="devops" className="m-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
                  <DevOpsPanel
                    projectId={id}
                    projectRepoUrl={project?.repo_url}
                    workspaceId={workspaceId}
                  />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Commit & Push dialog */}
      <Dialog open={pushOpen} onOpenChange={setPushOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCommit className="h-5 w-5" />Commit & Push
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Requirements checklist */}
            {!canPush && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5 text-xs">
                <p className="font-semibold text-amber-400">GitHub push requires:</p>
                <div className="flex items-center gap-2">
                  <span className={project?.repo_url ? "text-emerald-400" : "text-rose-400"}>
                    {project?.repo_url ? "✓" : "✗"}
                  </span>
                  <span className="text-muted-foreground">Project linked to a GitHub repo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={fileSource === "github" ? "text-emerald-400" : "text-rose-400"}>
                    {fileSource === "github" ? "✓" : "✗"}
                  </span>
                  <span className="text-muted-foreground"><code className="bg-muted px-1 rounded">GITHUB_TOKEN</code> set in server .env</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Commit message {canPush && "*"}</Label>
              <Input
                placeholder="feat: describe your changes"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                disabled={!canPush}
              />
            </div>

            <div>
              <Label className="mb-2 block">Changed files ({dirtyFiles.length})</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                {dirtyFiles.map((f) => (
                  <div key={f.path} className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-sm last:border-0">
                    <Circle className="h-2 w-2 shrink-0 fill-amber-400 text-amber-400" />
                    <span className="font-mono text-xs">{f.path}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPushOpen(false)}>Cancel</Button>
            {!canPush && (
              <Button variant="outline" onClick={downloadChanges}>
                Download changes
              </Button>
            )}
            <Button
              className="bg-gradient-to-r from-primary to-accent"
              onClick={pushChanges}
              disabled={!canPush || !commitMsg.trim() || pushing}
            >
              {pushing
                ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Pushing…</>
                : <><GitCommit className="mr-1.5 h-4 w-4" />Push to GitHub</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
