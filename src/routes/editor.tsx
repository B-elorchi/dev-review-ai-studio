import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useLayoutEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot, Check, ChevronDown, ChevronRight, Circle, File, FileCode, FilePlus,
  Folder, FolderOpen, GitBranch, Loader2, Lock, Play, Save, Search, Cpu,
  Send, Settings as SettingsIcon, Shield, Square, Sparkles,
  Terminal as TerminalIcon, Wand2, Wrench, X, Zap,
} from "lucide-react";
import { CodeEditor, type CodeEditorHandle } from "@/components/code-editor";
import { Terminal } from "@/components/Terminal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { API_BASE, fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

/** Fetch with automatic token-refresh retry on 401 */
async function fetchWithRefresh(url: string, init: RequestInit): Promise<Response> {
  let resp = await fetch(url, init);
  if (resp.status === 401) {
    const refreshed = await useAuthStore.getState().refreshSession();
    if (refreshed) {
      // Retry with new token
      const newToken = localStorage.getItem("token");
      const headers = new Headers(init.headers);
      if (newToken) headers.set("Authorization", `Bearer ${newToken}`);
      resp = await fetch(url, { ...init, headers });
    }
  }
  return resp;
}

export const Route = createFileRoute("/editor")({
  ssr: false,
  head: () => ({ meta: [{ title: "Editor — DevReview AI" }] }),
  component: EditorPage,
});

// ─── types ────────────────────────────────────────────────────────────────────

type FileNode = { name: string; type: "file" | "folder"; lang?: string; children?: FileNode[]; content?: string };
type ChatMsg  = { role: "user" | "agent"; text: string };
type AgentId  = "code-review" | "code-quality" | "security" | "dev";

const AGENTS: { id: AgentId; label: string; icon: any; color: string; placeholder: string }[] = [
  { id: "code-review",  label: "Code Review", icon: Shield, color: "from-blue-500 to-cyan-500",    placeholder: "Ask about bugs, anti-patterns, edge cases…" },
  { id: "code-quality", label: "Quality",     icon: Zap,    color: "from-purple-500 to-pink-500",  placeholder: "Ask about complexity, maintainability, SOLID…" },
  { id: "security",     label: "Security",    icon: Lock,   color: "from-rose-500 to-orange-500",  placeholder: "Ask about OWASP, secrets, injection risks…" },
  { id: "dev",          label: "DevOps",      icon: Wrench, color: "from-emerald-500 to-teal-500", placeholder: "Ask about Docker, CI/CD, Terraform, K8s…" },
];

// ─── demo fallback tree ───────────────────────────────────────────────────────

const DEMO_TREE: FileNode[] = [
  {
    name: "src", type: "folder", children: [
      {
        name: "components", type: "folder", children: [
          {
            name: "Button.tsx", type: "file", lang: "typescript",
            content: `import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "ghost" && "hover:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
`,
          },
        ],
      },
      {
        name: "App.tsx", type: "file", lang: "typescript",
        content: `import { Button } from "./components/Button";

export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold">DevReview Editor</h1>
        <p className="mt-2 text-muted-foreground">Code with your AI agents.</p>
        <Button className="mt-6">Get started</Button>
      </div>
    </main>
  );
}
`,
      },
    ],
  },
  {
    name: "package.json", type: "file", lang: "json",
    content: `{\n  "name": "devreview-app",\n  "version": "1.0.0",\n  "scripts": { "dev": "vite", "build": "vite build" },\n  "dependencies": { "react": "^19.0.0" }\n}\n`,
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function flatten(nodes: FileNode[], path = ""): { path: string; node: FileNode }[] {
  return nodes.flatMap((n) => {
    const p = path ? `${path}/${n.name}` : n.name;
    return n.type === "folder" && n.children
      ? [{ path: p, node: n }, ...flatten(n.children, p)]
      : [{ path: p, node: n }];
  });
}

function injectContent(nodes: FileNode[], samples: Record<string, { lang: string; content: string }>, prefix = ""): FileNode[] {
  return nodes.map((n) => {
    const path = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === "folder") return { ...n, children: injectContent(n.children ?? [], samples, path) };
    const s = samples[path];
    return s ? { ...n, lang: s.lang, content: s.content } : n;
  });
}

/** Insert a new file or folder node into the tree at the given parent path (empty = root) */
function addNodeToTree(
  nodes: FileNode[],
  parentPath: string,
  name: string,
  type: "file" | "folder",
): FileNode[] {
  if (!parentPath) {
    // Root level
    const newNode: FileNode = type === "folder"
      ? { name, type: "folder", children: [] }
      : { name, type: "file", lang: inferLang(name), content: "" };
    return [...nodes, newNode];
  }
  return nodes.map((n) => {
    const nodePath = n.name; // top-level: just the name
    if (n.type === "folder") {
      if (nodePath === parentPath) {
        const newNode: FileNode = type === "folder"
          ? { name, type: "folder", children: [] }
          : { name, type: "file", lang: inferLang(name), content: "" };
        return { ...n, children: [...(n.children ?? []), newNode] };
      }
      if (parentPath.startsWith(nodePath + "/")) {
        return { ...n, children: addNodeToTree(n.children ?? [], parentPath.slice(nodePath.length + 1), name, type) };
      }
    }
    return n;
  });
}

function inferLang(filename: string): string {
  const ext = filename.split(".").pop() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", json: "json", md: "markdown", css: "css", html: "html",
    yaml: "yaml", yml: "yaml", sh: "shell", env: "plaintext", toml: "toml",
    rs: "rust", go: "go", java: "java", cpp: "cpp", c: "c",
  };
  return map[ext] ?? "plaintext";
}

function extractLastCodeBlock(text: string) {
  const re = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  let last: { lang?: string; code: string } | null = null;
  while ((m = re.exec(text)) !== null) last = { lang: m[1] || undefined, code: m[2] };
  return last;
}

// ─── inline create input ──────────────────────────────────────────────────────

function CreatingInput({
  type, depth, onConfirm, onCancel,
}: {
  type: "file" | "folder"; depth: number;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => { inputRef.current?.focus(); }, []);

  const confirm = () => {
    const name = value.trim();
    if (name) onConfirm(name);
    else onCancel();
  };

  return (
    <div className="flex items-center gap-1 rounded py-0.5 pr-2" style={{ paddingLeft: depth * 12 + 20 }}>
      {type === "file"
        ? <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        : <Folder className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") confirm();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={confirm}
        placeholder={type === "file" ? "filename.ts" : "folder-name"}
        className="min-w-0 flex-1 rounded border border-primary/50 bg-background px-1 py-0 text-xs outline-none"
      />
    </div>
  );
}

// ─── file tree ────────────────────────────────────────────────────────────────

function FileTreeNode({
  node, depth, parentPath, onOpen, activePath, dirtyPaths,
  creating, onCreateConfirm, onCreateCancel, onStartCreate,
}: {
  node: FileNode; depth: number; parentPath: string;
  onOpen: (path: string, node: FileNode) => void;
  activePath: string; dirtyPaths: Set<string>;
  creating?: { type: "file" | "folder"; parentPath: string } | null;
  onCreateConfirm?: (name: string) => void;
  onCreateCancel?: () => void;
  onStartCreate?: (type: "file" | "folder", parentPath: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;

  if (node.type === "folder") {
    const isCreatingHere = creating?.parentPath === fullPath;
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="group flex w-full items-center gap-1 rounded py-1 pr-1 text-xs hover:bg-muted/50"
          style={{ paddingLeft: depth * 12 + 6 }}
        >
          <ChevronRight className={`h-3 w-3 shrink-0 transition ${open ? "rotate-90" : ""}`} />
          {open
            ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-sky-400" />
            : <Folder    className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
          <span className="min-w-0 flex-1 truncate text-left" title={node.name}>{node.name}</span>
          <span className="ml-auto hidden items-center gap-0.5 group-hover:flex">
            <span title="New File" onClick={(e) => { e.stopPropagation(); setOpen(true); onStartCreate?.("file", fullPath); }}
              className="rounded p-0.5 hover:bg-muted"><FilePlus className="h-3 w-3 text-muted-foreground" /></span>
            <span title="New Folder" onClick={(e) => { e.stopPropagation(); setOpen(true); onStartCreate?.("folder", fullPath); }}
              className="rounded p-0.5 hover:bg-muted"><Folder className="h-3 w-3 text-muted-foreground" /></span>
          </span>
        </button>
        {open && (
          <>
            {node.children?.map((c) => (
              <FileTreeNode key={c.name} node={c} depth={depth + 1} parentPath={fullPath}
                onOpen={onOpen} activePath={activePath} dirtyPaths={dirtyPaths}
                creating={creating} onCreateConfirm={onCreateConfirm} onCreateCancel={onCreateCancel}
                onStartCreate={onStartCreate} />
            ))}
            {isCreatingHere && (
              <CreatingInput
                type={creating!.type}
                depth={depth + 1}
                onConfirm={onCreateConfirm!}
                onCancel={onCreateCancel!}
              />
            )}
          </>
        )}
      </div>
    );
  }

  const isActive = activePath === fullPath;
  return (
    <button
      onClick={() => onOpen(fullPath, node)}
      title={fullPath}
      className={`flex w-full items-center gap-1.5 rounded py-1 pr-2 text-xs hover:bg-muted/50 ${isActive ? "bg-primary/15 text-primary" : ""}`}
      style={{ paddingLeft: depth * 12 + 20 }}
    >
      <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-left">{node.name}</span>
      {dirtyPaths.has(fullPath) && <Circle className="h-2 w-2 shrink-0 fill-amber-400 text-amber-400" />}
    </button>
  );
}

// ─── agent chat ───────────────────────────────────────────────────────────────

function AgentChat({
  agent, fileName, fileContent, workspaceId, onApply, onLiveEdit,
}: {
  agent: typeof AGENTS[number];
  fileName: string; fileContent: string; workspaceId: string;
  onApply: (code: string) => void;
  onLiveEdit: (code: string) => void;
}) {
  const [chat, setChat] = useState<ChatMsg[]>([
    { role: "agent", text: `Hi! I'm your **${agent.label}** agent. I use specialised tools to analyse your code deeply — ask me anything or hit a quick action.` },
  ]);
  const [input, setInput]       = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking]   = useState(false);
  const [liveEditing, setLiveEditing] = useState(false);
  const [applied, setApplied]   = useState<Record<number, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const send = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || streaming) return;
    setInput("");
    setChat((c) => [...c, { role: "user", text }]);
    setStreaming(true);
    setThinking(true);
    setChat((c) => [...c, { role: "agent", text: "" }]);

    const history = chat
      .filter((m) => m.role === "user")
      .map((m) => ({ role: "user" as const, content: m.text }));

    abortRef.current = new AbortController();
    try {
      const token = localStorage.getItem("token");
      const resp = await fetchWithRefresh(`${API_BASE}/ai/inline-chat`, {
        method: "POST",
        signal: abortRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          agentType: agent.id,
          message: /add|update|edit|fix|refactor|change|insert|remove|rename|rewrite/i.test(text)
            ? `${text}\n\nIMPORTANT: Return the COMPLETE updated file (every single line) inside ONE fenced code block. Do not return only the changed part.`
            : text,
          fileName,
          fileContent,
          history,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `Request failed (${resp.status})`);
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let accumulated = ""; // full streamed response
      let codeStart = -1; // index in `accumulated` where code content begins (after opening fence)

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
                setThinking(false);
                accumulated += d.text;
                setChat((c) => {
                  const next = [...c];
                  next[next.length - 1] = { ...next[next.length - 1], text: accumulated };
                  return next;
                });

                // Detect opening fence once and remember where code starts
                if (codeStart === -1) {
                  const fenceMatch = accumulated.match(/^```[a-zA-Z0-9_+-]*\n/m);
                  if (fenceMatch && fenceMatch.index !== undefined) {
                    codeStart = fenceMatch.index + fenceMatch[0].length;
                    setLiveEditing(true);
                  }
                }

                // If inside a code block, extract raw code and push live
                if (codeStart !== -1) {
                  const rest = accumulated.slice(codeStart);
                  // Strip closing fence if it has arrived
                  const closingFence = rest.indexOf("\n```");
                  const liveCode = closingFence === -1 ? rest : rest.slice(0, closingFence);
                  onLiveEdit(liveCode);
                }
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setChat((c) => {
          const next = [...c];
          next[next.length - 1] = { role: "agent", text: `Error: ${err.message ?? "Something went wrong. Please try again."}` };
          return next;
        });
      }
    } finally {
      setStreaming(false);
      setThinking(false);
      setLiveEditing(false);
    }
  }, [input, streaming, chat, agent.id, fileName, fileContent, workspaceId]);

  const Icon = agent.icon;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className={`flex items-center gap-2 border-b border-border/60 bg-gradient-to-r ${agent.color} bg-opacity-10 px-3 py-2`}>
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${agent.color} text-white shadow`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-xs font-semibold">{agent.label} Agent</div>
          <div className="text-[10px] text-muted-foreground">
            {fileName ? `Analysing ${fileName.split("/").pop()}` : "Ready"}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {liveEditing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
              <span className="text-[10px] text-amber-400">Live editing…</span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-emerald-400">Live</span>
            </>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1 border-b border-border/60 p-2">
        {[
          { label: "Review file", prompt: "Review this file and list all issues you find, ordered by severity." },
          { label: "Explain", prompt: "Explain what this file does and how it works." },
          { label: "Refactor", prompt: "Refactor this file for better readability. Return the COMPLETE updated file (every line) inside a single code block so I can apply it." },
          { label: "Fix bugs", prompt: "Find and fix all bugs. Return the COMPLETE fixed file (every line) inside a single code block so I can apply it." },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => send(a.prompt)}
            disabled={streaming}
            className="rounded border border-border px-2 py-0.5 text-[10px] hover:bg-muted/50 disabled:opacity-40"
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <ScrollArea className="min-w-0 flex-1 p-3 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <div className="w-full min-w-0 space-y-3">
          {chat.map((m, i) => {
            const isUser = m.role === "user";
            const block = !isUser ? extractLastCodeBlock(m.text) : null;
            return (
              <div key={i} className={`flex min-w-0 gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${isUser ? "bg-muted text-[9px] font-bold" : `bg-gradient-to-br ${agent.color} text-white`}`}>
                  {isUser ? "ME" : <Icon className="h-3 w-3" />}
                </div>
                <div className={`min-w-0 max-w-[85%] space-y-2 overflow-hidden break-words rounded-lg px-2.5 py-2 text-xs leading-relaxed ${isUser ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
                  {/* Thinking indicator while agent runs tools */}
                  {!isUser && thinking && i === chat.length - 1 && !m.text && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Running analysis tools…</span>
                    </div>
                  )}
                  <div className="prose prose-invert prose-xs max-w-none break-words [&_code]:break-all [&_code]:text-[11px] [&_p]:my-1 [&_pre]:my-1.5 [&_pre]:max-h-40 [&_pre]:max-w-full [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-[#0a0d18] [&_pre]:p-2 [&_pre]:text-[11px] [&_pre_code]:break-normal [&_ul]:my-1">
                    <ReactMarkdown>
                      {m.text || (streaming && !thinking && i === chat.length - 1 ? "▍" : "")}
                    </ReactMarkdown>
                  </div>
                  {block && (
                    <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {block.code.split("\n").length} lines · {block.lang ?? "code"}
                      </span>
                      <Button
                        size="sm"
                        variant={applied[i] ? "outline" : "default"}
                        disabled={applied[i]}
                        onClick={() => { onApply(block.code); setApplied((s) => ({ ...s, [i]: true })); toast.success("Applied to editor"); }}
                        className="h-5 gap-1 px-2 text-[10px]"
                      >
                        {applied[i] ? <><Check className="h-2.5 w-2.5" />Applied</> : <><Wand2 className="h-2.5 w-2.5" />Apply</>}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/60 p-2">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-background p-2 focus-within:border-primary/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={agent.placeholder}
            className="max-h-24 min-h-[40px] flex-1 resize-none bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          {streaming
            ? <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => abortRef.current?.abort()}><Square className="h-3 w-3" /></Button>
            : <Button size="icon" className={`h-7 w-7 shrink-0 bg-gradient-to-r ${agent.color}`} disabled={!input.trim()} onClick={() => send()}><Send className="h-3 w-3" /></Button>
          }
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

function EditorPage() {
  const { workspaceId } = useAuthStore();

  // Sidebar / activity bar
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [activeBar, setActiveBar]       = useState<"explorer" | "search" | "git">("explorer");

  // Projects
  const [projects, setProjects]         = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [loadingProject, setLoadingProject]   = useState(false);

  // File tree
  const [fileTree, setFileTree]         = useState<FileNode[]>(DEMO_TREE);
  const [fileSource, setFileSource]     = useState<"demo" | "github" | "static">("demo");

  // Editor state
  const [openTabs, setOpenTabs]         = useState<string[]>(["src/App.tsx"]);
  const [active, setActive]             = useState("src/App.tsx");
  const [contents, setContents]         = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const { path, node } of flatten(DEMO_TREE)) if (node.content !== undefined) m[path] = node.content;
    return m;
  });
  const [originals, setOriginals]       = useState<Record<string, string>>({});

  const allFiles    = flatten(fileTree).filter((f) => f.node.type === "file");
  const activeNode  = allFiles.find((f) => f.path === active)?.node;
  const activeContent = contents[active] ?? activeNode?.content ?? "";
  const activeLang    = activeNode?.lang ?? "plaintext";

  const dirtyPaths = new Set(
    Object.entries(contents).filter(([p, c]) => originals[p] !== undefined && c !== originals[p]).map(([p]) => p),
  );

  // Load projects on mount
  useEffect(() => {
    if (!workspaceId) return;
    fetchApi("/projects", {}, workspaceId)
      .then((d) => setProjects(d.projects ?? []))
      .catch(console.error);
  }, [workspaceId]);

  // Select a project → fetch files
  const selectProject = async (p: any) => {
    if (!workspaceId) return;
    setSelectedProject(p);
    setLoadingProject(true);
    try {
      const fData = await fetchApi(`/projects/${p.id}/files`, {}, workspaceId);
      const tree  = injectContent(fData.fileTree ?? DEMO_TREE, fData.sampleFiles ?? {});
      setFileTree(tree);
      setFileSource(fData.source === "github" ? "github" : "static");

      const newC: Record<string, string> = {};
      const newO: Record<string, string> = {};
      for (const { path, node } of flatten(tree)) {
        if (node.type === "file" && node.content !== undefined) { newC[path] = node.content; newO[path] = node.content; }
      }
      setContents(newC);
      setOriginals(newO);

      const first = flatten(tree).find((f) => f.node.type === "file");
      if (first) { setOpenTabs([first.path]); setActive(first.path); }

      toast.success(`Loaded ${p.name}${fData.source === "github" ? " from GitHub" : ""}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load project files");
    } finally {
      setLoadingProject(false);
    }
  };

  const openFile = async (path: string, node: FileNode) => {
    if (!openTabs.includes(path)) setOpenTabs((prev) => [...prev, path]);
    setActive(path);
    if (contents[path] === undefined) {
      if (node.content !== undefined) {
        setContents((c) => ({ ...c, [path]: node.content! }));
        setOriginals((o) => ({ ...o, [path]: node.content! }));
      } else if (selectedProject && workspaceId) {
        setContents((c) => ({ ...c, [path]: "Loading..." }));
        try {
          const encPath = path.split("/").map(encodeURIComponent).join("/");
          const res = await fetchApi(`/projects/${selectedProject.id}/files/${encPath}`, {}, workspaceId);
          if (res.content) {
            setContents((c) => ({ ...c, [path]: res.content }));
            setOriginals((o) => ({ ...o, [path]: res.content }));
          } else {
            setContents((c) => ({ ...c, [path]: "// Empty or binary file" }));
          }
        } catch {
          setContents((c) => ({ ...c, [path]: "// Failed to load file" }));
        }
      }
    }
  };

  const closeTab = (path: string) => {
    const next = openTabs.filter((t) => t !== path);
    setOpenTabs(next);
    if (active === path && next.length) setActive(next[next.length - 1]);
  };

  const handleCreateConfirm = (name: string) => {
    if (!creating) return;
    const fullPath = creating.parentPath ? `${creating.parentPath}/${name}` : name;
    setFileTree((t) => addNodeToTree(t, creating.parentPath, name, creating.type));
    setCreating(null);
    if (creating.type === "file") {
      setContents((c) => ({ ...c, [fullPath]: "" }));
      setOriginals((o) => ({ ...o, [fullPath]: "" }));
      if (!openTabs.includes(fullPath)) setOpenTabs((tabs) => [...tabs, fullPath]);
      setActive(fullPath);
    }
    toast.success(`Created ${creating.type} "${name}"`);
  };

  const handleSave = async () => {
    if (!selectedProject || dirtyPaths.size === 0) return;
    
    let toastId: string | number = "";
    try {
      toastId = toast.loading(`Saving ${dirtyPaths.size} file(s)...`);
      
      for (const path of Array.from(dirtyPaths)) {
        await fetchApi(`/editor/sandboxes/${selectedProject.id}/files`, {
          method: "PUT",
          body: JSON.stringify({ path, content: contents[path] })
        }, workspaceId!);
      }
      
      // Update originals to clear dirty state
      const newOriginals = { ...originals };
      for (const path of Array.from(dirtyPaths)) {
        newOriginals[path] = contents[path];
      }
      setOriginals(newOriginals);
      
      toast.success("Files saved successfully", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to save files", { id: toastId });
    }
  };

  const editorRef = useRef<CodeEditorHandle>(null);
  const [applyVersion, setApplyVersion] = useState(0);
  const [creating, setCreating] = useState<{ type: "file" | "folder"; parentPath: string } | null>(null);

  const toggleSidebar = (bar: typeof activeBar) => {
    if (activeBar === bar && sidebarOpen) { setSidebarOpen(false); return; }
    setActiveBar(bar);
    setSidebarOpen(true);
  };

  const projectLabel = selectedProject?.name ?? "Demo project";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-[#0a0d18]">

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border/60 bg-background/40 px-3 backdrop-blur-xl">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-muted/50">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-primary to-accent text-[10px] font-bold text-primary-foreground">
                {projectLabel[0]?.toUpperCase() ?? "D"}
              </span>
              <span className="font-medium">{projectLabel}</span>
              {loadingProject && <Loader2 className="h-3 w-3 animate-spin" />}
              {!loadingProject && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Projects</div>
            {projects.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => selectProject(p)}
                className={selectedProject?.id === p.id ? "bg-primary/10 font-medium" : ""}>
                {p.name}
                {p.repo_url && <span className="ml-auto text-[10px] text-muted-foreground">GitHub</span>}
              </DropdownMenuItem>
            ))}
            {projects.length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground">No projects found.</div>}
            <div className="my-1 border-t border-border/60" />
            <DropdownMenuItem className="text-muted-foreground" onClick={() => {
              setSelectedProject(null); setFileTree(DEMO_TREE); setFileSource("demo");
              const m: Record<string, string> = {};
              for (const { path, node } of flatten(DEMO_TREE)) if (node.content !== undefined) m[path] = node.content;
              setContents(m); setOriginals({}); setOpenTabs(["src/App.tsx"]); setActive("src/App.tsx");
            }}>Demo project</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <GitBranch className="h-3 w-3" /><span>main</span>
          {fileSource === "github" && (
            <Badge variant="outline" className="ml-1 h-4 border-emerald-500/30 bg-emerald-500/10 px-1 text-[9px] text-emerald-400">synced</Badge>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs"
            onClick={handleSave}
            disabled={dirtyPaths.size === 0}>
            <Save className="h-3 w-3" />Save
          </Button>
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs">
            <Play className="h-3 w-3" />Run
          </Button>
        </div>
      </div>

      {/* ── Body: activity bar + resizable panels ───────────────────── */}
      <div className="flex min-h-0 flex-1">

        {/* Activity bar — SIBLING of ResizablePanelGroup, never inside it */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border/60 bg-background/30 py-2">
          {([
            { id: "explorer" as const, icon: File,    title: "Explorer" },
            { id: "search"   as const, icon: Search,  title: "Search" },
            { id: "git"      as const, icon: GitBranch, title: "Source Control" },
          ]).map((b) => (
            <button
              key={b.id}
              title={b.title}
              onClick={() => toggleSidebar(b.id)}
              className={`flex h-9 w-9 items-center justify-center rounded transition ${
                activeBar === b.id && sidebarOpen
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <b.icon className="h-4 w-4" />
            </button>
          ))}
          <div className="my-1 h-px w-8 bg-border/60" />
          <button
            title="AI Agents"
            onClick={() => toast.info("AI agents are in the right panel →")}
            className="flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <button
            title="Settings"
            className="mt-auto flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Everything else is resizable panels */}
        {/* @ts-expect-error - React-resizable-panels types are missing */}
        <ResizablePanelGroup direction={"horizontal" as any} className="flex-1">

          {/* Explorer sidebar — only rendered when open */}
          {sidebarOpen && (
            <>
              <ResizablePanel id="sidebar" defaultSize={18} minSize={10}>
                <div className="flex h-full flex-col bg-background/20">
                  <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {activeBar === "explorer" ? "Explorer" : activeBar === "search" ? "Search" : "Source Control"}
                    </span>
                    {activeBar === "explorer" && (
                      <div className="flex gap-0.5">
                        <Button size="icon" variant="ghost" className="h-5 w-5" title="New File"
                          onClick={() => setCreating({ type: "file", parentPath: "" })}>
                          <FilePlus className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-5 w-5" title="New Folder"
                          onClick={() => setCreating({ type: "folder", parentPath: "" })}>
                          <Folder className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {activeBar === "explorer" && (
                    <ScrollArea className="flex-1 p-1.5">
                      <div className="mb-2 px-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {projectLabel}
                      </div>
                      {loadingProject ? (
                        <div className="flex justify-center p-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                      ) : (
                        <>
                          {fileTree.map((n) => (
                            <FileTreeNode key={n.name} node={n} depth={0} parentPath="" onOpen={openFile}
                              activePath={active} dirtyPaths={dirtyPaths}
                              creating={creating} onCreateConfirm={handleCreateConfirm} onCreateCancel={() => setCreating(null)}
                              onStartCreate={(type, parentPath) => setCreating({ type, parentPath })} />
                          ))}
                          {/* Root-level create input */}
                          {creating && creating.parentPath === "" && (
                            <CreatingInput
                              type={creating.type}
                              depth={0}
                              onConfirm={handleCreateConfirm}
                              onCancel={() => setCreating(null)}
                            />
                          )}
                        </>
                      )}
                    </ScrollArea>
                  )}

                  {activeBar === "search" && (
                    <div className="p-2">
                      <input
                        placeholder="Search files…"
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/50"
                      />
                      <div className="mt-2 text-[10px] text-muted-foreground">Start typing to search</div>
                    </div>
                  )}

                  {activeBar === "git" && (
                    <div className="p-3 text-xs text-muted-foreground">
                      {dirtyPaths.size > 0 ? (
                        <>
                          <div className="mb-2 font-medium text-foreground">{dirtyPaths.size} change{dirtyPaths.size !== 1 ? "s" : ""}</div>
                          {Array.from(dirtyPaths).map((p) => (
                            <div key={p} className="flex items-center gap-1.5 py-0.5 text-amber-400">
                              <Circle className="h-2 w-2 fill-current" />
                              {p.split("/").pop()}
                            </div>
                          ))}
                        </>
                      ) : (
                        <div>No changes — all files clean.</div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>{dirtyPaths.size} change{dirtyPaths.size !== 1 ? "s" : ""}</span>
                      <span className="flex items-center gap-1"><Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />main</span>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Editor + terminal */}
          <ResizablePanel id="main-editor-area" defaultSize={sidebarOpen ? 50 : 65} minSize={20}>
            {/* @ts-expect-error - React-resizable-panels types are missing */}
            <ResizablePanelGroup id="vertical-group" direction={"vertical" as any}>
              <ResizablePanel id="code-editor" defaultSize={72} minSize={30}>
                <div className="flex h-full flex-col">
                  {/* Tabs */}
                  <div className="flex h-9 shrink-0 items-center border-b border-border/60 bg-background/20 overflow-x-auto">
                    {openTabs.map((t) => {
                      const isActive = t === active;
                      return (
                        <button
                          key={t}
                          onClick={() => setActive(t)}
                          className={`group relative flex h-full shrink-0 items-center gap-1.5 border-r border-border/60 px-3 text-xs transition ${isActive ? "bg-[#0e1320] text-foreground" : "text-muted-foreground hover:bg-muted/20"}`}
                        >
                          <FileCode className="h-3 w-3" />
                          <span>{t.split("/").pop()}</span>
                          {dirtyPaths.has(t) && <Circle className="h-1.5 w-1.5 fill-amber-400 text-amber-400" />}
                          <X
                            className="h-3 w-3 opacity-0 transition group-hover:opacity-60 hover:!opacity-100"
                            onClick={(e) => { e.stopPropagation(); closeTab(t); }}
                          />
                          {isActive && <span className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-primary to-accent" />}
                        </button>
                      );
                    })}
                    {openTabs.length === 0 && (
                      <div className="px-4 text-xs text-muted-foreground">No files open</div>
                    )}
                  </div>

                  {/* Breadcrumb */}
                  <div className="flex h-7 shrink-0 items-center gap-1 border-b border-border/60 bg-background/10 px-3 text-[11px] text-muted-foreground">
                    {active.split("/").map((s, i, arr) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="h-3 w-3" />}
                        <span className={i === arr.length - 1 ? "text-foreground" : ""}>{s}</span>
                      </span>
                    ))}
                  </div>

                  {/* Monaco */}
                  <div className="min-h-0 flex-1">
                    {activeNode ? (
                      <CodeEditor
                        ref={editorRef}
                        key={`${active}-${applyVersion}`}
                        defaultValue={activeContent}
                        language={activeLang}
                        onChange={(v) => setContents((c) => ({ ...c, [active]: v }))}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Select a file from the explorer to start editing
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Terminal */}
              <ResizablePanel id="terminal-panel" defaultSize={28} minSize={12}>
                <div className="flex h-full flex-col bg-[#06080f]">
                  <Tabs defaultValue="terminal" className="flex h-full flex-col">
                    <div className="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
                      <TabsList className="h-7 bg-transparent">
                        <TabsTrigger value="terminal" className="h-6 gap-1.5 text-xs"><TerminalIcon className="h-3 w-3" />Terminal</TabsTrigger>
                        <TabsTrigger value="problems" className="h-6 text-xs">Problems</TabsTrigger>
                        <TabsTrigger value="output"   className="h-6 text-xs">Output</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="terminal" className="m-0 flex-1 overflow-hidden">
                      <Terminal
                        sandboxId={selectedProject?.id}
                        dirtyPaths={dirtyPaths}
                        modifiedFiles={{
                          ...contents,
                          // sentinel so Terminal can show the real remote URL
                          ...(selectedProject?.repo_url ? { "__repoUrl__": selectedProject.repo_url } : {}),
                        }}
                      />
                    </TabsContent>
                    <TabsContent value="problems" className="m-0 flex-1 overflow-auto p-3 text-xs space-y-1">
                      <div className="flex items-start gap-2 rounded p-1.5 hover:bg-muted/30">
                        <Circle className="mt-0.5 h-3 w-3 fill-amber-400 text-amber-400" />
                        <div><div>Unused variable 'config'</div><div className="text-[10px] text-muted-foreground">src/lib/api.ts:4</div></div>
                      </div>
                    </TabsContent>
                    <TabsContent value="output" className="m-0 flex-1 overflow-auto p-3 font-mono text-xs text-muted-foreground">
                      Server started on port 4000
                    </TabsContent>
                  </Tabs>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* AI Agents panel */}
          <ResizablePanel id="ai-panel" defaultSize={32} minSize={15}>
            <div className="flex h-full flex-col overflow-hidden border-l border-border/60 bg-background/40">
              <Tabs defaultValue="code-review" className="flex h-full min-h-0 flex-col overflow-hidden">
                {/* Agent tab selector */}
                <div className="shrink-0 border-b border-border/60 bg-background/20 px-2 pt-2 pb-1">
                  <div className="mb-1 flex items-center gap-1.5 px-1">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Agents</span>
                  </div>
                  {/* TabsTrigger must live inside TabsList */}
                  <TabsList className="grid h-auto grid-cols-4 gap-0.5 bg-transparent p-0">
                    {AGENTS.map((a) => {
                      const Icon = a.icon;
                      return (
                        <TabsTrigger
                          key={a.id}
                          value={a.id}
                          title={a.label}
                          className="flex flex-col items-center gap-0.5 rounded border border-transparent px-1 py-1.5 text-[9px] leading-tight data-[state=active]:border-primary/30 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate max-w-full">{a.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                {/* Chat panels */}
                {AGENTS.map((a) => (
                  <TabsContent
                    key={a.id}
                    value={a.id}
                    className="m-0 min-h-0 flex-1 overflow-hidden"
                  >
                    {workspaceId ? (
                      <AgentChat
                        agent={a}
                        fileName={active}
                        fileContent={activeContent}
                        workspaceId={workspaceId}
                        onLiveEdit={(code) => {
                          // Stream code directly into Monaco without remounting
                          editorRef.current?.setValue(code);
                          setContents((c) => ({ ...c, [active]: code }));
                        }}
                        onApply={(code) => {
                          setContents((c) => ({ ...c, [active]: code }));
                          setApplyVersion((v) => v + 1);
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
                        Sign in to use AI agents.
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>

      {/* Status bar */}
      <div className="flex h-6 shrink-0 items-center gap-3 border-t border-border/60 bg-gradient-to-r from-primary/20 to-accent/20 px-3 text-[10px]">
        <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />main</span>
        <span>{dirtyPaths.size > 0 ? `${dirtyPaths.size} unsaved` : "0 errors"}</span>
        <div className="ml-auto flex items-center gap-3 text-muted-foreground">
          <span>UTF-8</span>
          <span>{activeLang}</span>
          <span className="flex items-center gap-1 text-emerald-400"><Circle className="h-2 w-2 fill-current" />AI ready</span>
        </div>
      </div>
    </div>
  );
}
