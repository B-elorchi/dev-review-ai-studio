import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import {
  Bot, Check, ChevronRight, File, FileCode, FilePlus, Folder, FolderOpen, GitBranch,
  Loader2, Play, Save, Search, Send, Settings as SettingsIcon, Sparkles, Square,
  Terminal as TerminalIcon, X, Circle, ChevronDown, Wand2, Command,
} from "lucide-react";
import { CodeEditor } from "@/components/code-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/editor")({
  ssr: false,
  head: () => ({ meta: [{ title: "Editor — DevReview AI" }] }),
  component: EditorPage,
});

type FileNode = {
  name: string;
  type: "file" | "folder";
  lang?: string;
  children?: FileNode[];
  content?: string;
};

const tree: FileNode[] = [
  {
    name: "src", type: "folder", children: [
      {
        name: "components", type: "folder", children: [
          { name: "Button.tsx", type: "file", lang: "typescript", content: `import { forwardRef, type ButtonHTMLAttributes } from "react";\nimport { cn } from "@/lib/utils";\n\ntype Props = ButtonHTMLAttributes<HTMLButtonElement> & {\n  variant?: "primary" | "ghost";\n};\n\nexport const Button = forwardRef<HTMLButtonElement, Props>(\n  ({ className, variant = "primary", ...props }, ref) => (\n    <button\n      ref={ref}\n      className={cn(\n        "rounded-md px-4 py-2 text-sm font-medium transition",\n        variant === "primary" && "bg-primary text-primary-foreground",\n        variant === "ghost" && "hover:bg-muted",\n        className,\n      )}\n      {...props}\n    />\n  ),\n);\nButton.displayName = "Button";\n` },
          { name: "Card.tsx", type: "file", lang: "typescript", content: `export function Card({ children }: { children: React.ReactNode }) {\n  return <div className="rounded-xl border bg-card p-6">{children}</div>;\n}\n` },
        ],
      },
      {
        name: "lib", type: "folder", children: [
          { name: "utils.ts", type: "file", lang: "typescript", content: `import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}\n` },
          { name: "api.ts", type: "file", lang: "typescript", content: `const BASE = "https://api.devreview.ai/v1";\n\nexport async function fetchReviews(repo: string) {\n  const res = await fetch(\`\${BASE}/reviews?repo=\${repo}\`);\n  if (!res.ok) throw new Error("Failed to load reviews");\n  return res.json();\n}\n` },
        ],
      },
      { name: "App.tsx", type: "file", lang: "typescript", content: `import { Button } from "./components/Button";\n\nexport default function App() {\n  return (\n    <main className="flex min-h-screen items-center justify-center bg-background">\n      <div className="text-center">\n        <h1 className="text-4xl font-bold">DevReview Editor</h1>\n        <p className="mt-2 text-muted-foreground">Code with your AI pair-programmer.</p>\n        <Button className="mt-6">Get started</Button>\n      </div>\n    </main>\n  );\n}\n` },
      { name: "main.tsx", type: "file", lang: "typescript", content: `import { createRoot } from "react-dom/client";\nimport App from "./App";\nimport "./styles.css";\n\ncreateRoot(document.getElementById("root")!).render(<App />);\n` },
    ],
  },
  {
    name: "public", type: "folder", children: [
      { name: "favicon.svg", type: "file", lang: "xml", content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#5b8cff"/></svg>` },
    ],
  },
  { name: "package.json", type: "file", lang: "json", content: `{\n  "name": "devreview-app",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build",\n    "lint": "eslint ."\n  },\n  "dependencies": {\n    "react": "^19.0.0",\n    "react-dom": "^19.0.0"\n  }\n}\n` },
  { name: "README.md", type: "file", lang: "markdown", content: `# DevReview App\n\nA demo project edited inside the DevReview AI online IDE.\n\n## Getting started\n\n\`\`\`bash\nbun install\nbun dev\n\`\`\`\n` },
  { name: ".gitignore", type: "file", lang: "plaintext", content: `node_modules\ndist\n.env\n.DS_Store\n` },
];

function flatten(nodes: FileNode[], path = ""): { path: string; node: FileNode }[] {
  return nodes.flatMap((n) => {
    const p = path ? `${path}/${n.name}` : n.name;
    return n.type === "folder" && n.children
      ? [{ path: p, node: n }, ...flatten(n.children, p)]
      : [{ path: p, node: n }];
  });
}

const allFiles = flatten(tree).filter((f) => f.node.type === "file");

function FileTree({
  nodes, depth = 0, onOpen, openPath,
}: { nodes: FileNode[]; depth?: number; onOpen: (path: string) => void; openPath: string }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ src: true, "src/components": true, "src/lib": true });

  return (
    <div>
      {nodes.map((n) => {
        const fullPath = depth === 0 ? n.name : `${openPath}/${n.name}`;
        if (n.type === "folder") {
          const isOpen = expanded[n.name] ?? false;
          return (
            <div key={n.name}>
              <button
                onClick={() => setExpanded({ ...expanded, [n.name]: !isOpen })}
                className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-xs hover:bg-muted/50"
                style={{ paddingLeft: depth * 12 + 6 }}
              >
                <ChevronRight className={`h-3 w-3 shrink-0 transition ${isOpen ? "rotate-90" : ""}`} />
                {isOpen ? <FolderOpen className="h-3.5 w-3.5 text-sky-400" /> : <Folder className="h-3.5 w-3.5 text-sky-400" />}
                <span className="truncate">{n.name}</span>
              </button>
              {isOpen && n.children && (
                <FileTree nodes={n.children} depth={depth + 1} onOpen={onOpen} openPath={fullPath} />
              )}
            </div>
          );
        }
        return (
          <button
            key={n.name}
            onClick={() => onOpen(fullPath)}
            className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-xs hover:bg-muted/50"
            style={{ paddingLeft: depth * 12 + 18 }}
          >
            <FileCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{n.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function findFile(path: string): FileNode | undefined {
  return allFiles.find((f) => f.path === path)?.node;
}

function extractLastCodeBlock(text: string): { lang?: string; code: string } | null {
  const re = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  let last: { lang?: string; code: string } | null = null;
  while ((m = re.exec(text)) !== null) {
    last = { lang: m[1] || undefined, code: m[2] };
  }
  return last;
}

function EditorPage() {
  const [openTabs, setOpenTabs] = useState<string[]>(["src/App.tsx", "src/components/Button.tsx", "package.json"]);
  const [active, setActive] = useState("src/App.tsx");
  // Per-path overridden contents (so AI edits + manual edits persist)
  const [contents, setContents] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of allFiles) init[f.path] = f.node.content ?? "";
    return init;
  });
  const [input, setInput] = useState("");
  const [appliedIds, setAppliedIds] = useState<Record<string, boolean>>({});

  const activeFile = findFile(active);
  const activeContent = contents[active] ?? activeFile?.content ?? "";
  const activeLang = activeFile?.lang ?? "plaintext";

  // Keep a ref so transport prepareSendMessagesRequest always sees latest context
  const ctxRef = useRef({ active, activeContent, activeLang });
  useEffect(() => {
    ctxRef.current = { active, activeContent, activeLang };
  }, [active, activeContent, activeLang]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/editor-chat",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...body,
            messages,
            fileName: ctxRef.current.active,
            fileLang: ctxRef.current.activeLang,
            fileContent: ctxRef.current.activeContent,
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
    onError: (e) => toast.error(e.message || "AI request failed"),
  });

  const isLoading = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const openFile = (path: string) => {
    if (!openTabs.includes(path)) setOpenTabs([...openTabs, path]);
    setActive(path);
  };
  const closeTab = (path: string) => {
    const next = openTabs.filter((t) => t !== path);
    setOpenTabs(next);
    if (active === path && next.length) setActive(next[next.length - 1]);
  };
  const send = (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  };
  const applyCode = (msgId: string, code: string) => {
    setContents((c) => ({ ...c, [active]: code }));
    setAppliedIds((s) => ({ ...s, [msgId]: true }));
    toast.success(`Applied changes to ${active.split("/").pop()}`);
  };

  const quickActions: { label: string; icon: typeof Bot; prompt: string }[] = [
    { label: "Explain", icon: Bot, prompt: "Explain what this file does, its structure, and any non-obvious behavior. Do not modify the code." },
    { label: "Refactor", icon: Wand2, prompt: "Refactor this file for readability and maintainability. Return the full updated file." },
    { label: "Fix bugs", icon: Circle, prompt: "Find and fix any bugs or potential issues in this file. Return the full updated file." },
    { label: "Add tests", icon: FileCode, prompt: "Add tests for this file. If the file itself is the code, write a test file's full contents instead." },
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-[#0a0d18]">
      {/* Editor toolbar */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border/60 bg-background/40 px-3 backdrop-blur-xl">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-primary to-accent text-[10px] font-bold text-primary-foreground">D</span>
          <span className="font-medium">devreview-app</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </div>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <GitBranch className="h-3 w-3" /><span>main</span>
          <Badge variant="outline" className="ml-1 h-4 border-emerald-500/30 bg-emerald-500/10 px-1 text-[9px] text-emerald-400">synced</Badge>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs"><Save className="h-3 w-3" />Save</Button>
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs"><Play className="h-3 w-3" />Run</Button>
          <Button size="sm" className="h-7 gap-1.5 bg-gradient-to-r from-primary to-accent text-xs">
            <Sparkles className="h-3 w-3" />Ask AI
            <kbd className="ml-1 rounded bg-black/30 px-1 text-[9px]"><Command className="inline h-2.5 w-2.5" />K</kbd>
          </Button>
        </div>
      </div>

      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* Activity bar */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border/60 bg-background/30 py-2">
          {[
            { icon: File, active: true }, { icon: Search }, { icon: GitBranch },
            { icon: Bot }, { icon: SettingsIcon },
          ].map((b, i) => (
            <button key={i} className={`flex h-9 w-9 items-center justify-center rounded ${b.active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
              <b.icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Explorer */}
        <ResizablePanel defaultSize={16} minSize={12} maxSize={28}>
          <div className="flex h-full flex-col bg-background/20">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Explorer</span>
              <div className="flex gap-0.5">
                <Button size="icon" variant="ghost" className="h-5 w-5"><FilePlus className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-5 w-5"><Folder className="h-3 w-3" /></Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-1.5">
              <div className="mb-2 px-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">devreview-app</div>
              <FileTree nodes={tree} onOpen={openFile} openPath="" />
            </ScrollArea>
            <div className="border-t border-border/60 p-2 text-[10px] text-muted-foreground">
              <div className="flex items-center justify-between"><span>3 changes</span><span className="flex items-center gap-1"><Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />main</span></div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Editor + terminal */}
        <ResizablePanel defaultSize={56}>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel defaultSize={70} minSize={30}>
              <div className="flex h-full flex-col">
                {/* Tabs */}
                <div className="flex h-9 shrink-0 items-center border-b border-border/60 bg-background/20">
                  {openTabs.map((t) => {
                    const isActive = t === active;
                    const name = t.split("/").pop();
                    return (
                      <button
                        key={t}
                        onClick={() => setActive(t)}
                        className={`group flex h-full items-center gap-2 border-r border-border/60 px-3 text-xs transition ${isActive ? "bg-[#0e1320] text-foreground" : "text-muted-foreground hover:bg-muted/30"}`}
                      >
                        <FileCode className="h-3 w-3" />
                        <span>{name}</span>
                        <X
                          className="h-3 w-3 opacity-0 transition hover:text-foreground group-hover:opacity-60"
                          onClick={(e) => { e.stopPropagation(); closeTab(t); }}
                        />
                        {isActive && <span className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-primary to-accent" />}
                      </button>
                    );
                  })}
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
                <div className="flex-1 min-h-0">
                  {activeFile ? (
                    <CodeEditor
                      value={activeContent}
                      language={activeLang}
                      onChange={(v) => setContents((c) => ({ ...c, [active]: v }))}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Select a file to start editing</div>
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize={30} minSize={12}>
              <div className="flex h-full flex-col bg-[#06080f]">
                <Tabs defaultValue="terminal" className="flex h-full flex-col">
                  <div className="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
                    <TabsList className="h-7 bg-transparent">
                      <TabsTrigger value="terminal" className="h-6 gap-1.5 text-xs"><TerminalIcon className="h-3 w-3" />Terminal</TabsTrigger>
                      <TabsTrigger value="problems" className="h-6 gap-1.5 text-xs">Problems <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">2</Badge></TabsTrigger>
                      <TabsTrigger value="output" className="h-6 text-xs">Output</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="terminal" className="flex-1 m-0 overflow-auto p-3 font-mono text-[12px] leading-relaxed">
                    <div className="text-emerald-400">jane@devreview <span className="text-sky-400">~/devreview-app</span> $ <span className="text-foreground">bun dev</span></div>
                    <div className="text-muted-foreground">  Vite v7.0.0  ready in <span className="text-foreground">312 ms</span></div>
                    <div className="text-muted-foreground">  ➜  Local:   <span className="text-sky-400">http://localhost:5173/</span></div>
                    <div className="text-muted-foreground">  ➜  Network: use --host to expose</div>
                    <div className="mt-2 text-emerald-400">jane@devreview <span className="text-sky-400">~/devreview-app</span> $ <span className="text-foreground">git status</span></div>
                    <div className="text-muted-foreground">On branch <span className="text-emerald-400">main</span></div>
                    <div className="text-muted-foreground">Changes not staged for commit:</div>
                    <div className="text-amber-400">  modified:   src/App.tsx</div>
                    <div className="text-amber-400">  modified:   src/components/Button.tsx</div>
                    <div className="text-emerald-400">  new file:   src/lib/api.ts</div>
                    <div className="mt-2 text-emerald-400">jane@devreview <span className="text-sky-400">~/devreview-app</span> $ <span className="inline-block h-3.5 w-1.5 animate-pulse bg-foreground align-middle" /></div>
                  </TabsContent>
                  <TabsContent value="problems" className="flex-1 m-0 overflow-auto p-3 text-xs">
                    <div className="flex items-start gap-2 rounded p-1.5 hover:bg-muted/30">
                      <Circle className="mt-0.5 h-3 w-3 fill-amber-400 text-amber-400" />
                      <div><div>Unused variable 'config'</div><div className="text-[10px] text-muted-foreground">src/lib/api.ts:4 • ts(6133)</div></div>
                    </div>
                    <div className="flex items-start gap-2 rounded p-1.5 hover:bg-muted/30">
                      <Circle className="mt-0.5 h-3 w-3 fill-red-400 text-red-400" />
                      <div><div>Cannot find name 'fetchUser'</div><div className="text-[10px] text-muted-foreground">src/App.tsx:12 • ts(2304)</div></div>
                    </div>
                  </TabsContent>
                  <TabsContent value="output" className="flex-1 m-0 overflow-auto p-3 font-mono text-xs text-muted-foreground">
                    [Vite] hmr update /src/App.tsx<br />
                    [Vite] page reload src/components/Button.tsx
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle />

        {/* AI assistant (Cursor-style) */}
        <ResizablePanel defaultSize={28} minSize={20} maxSize={45}>
          <div className="flex h-full flex-col border-l border-border/60 bg-background/40 backdrop-blur-xl">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 px-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-primary to-accent">
                  <Sparkles className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium">AI Composer</span>
                <Badge variant="outline" className="h-4 px-1 text-[9px]">GPT-5</Badge>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6"><SettingsIcon className="h-3 w-3" /></Button>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-1.5 border-b border-border/60 p-2">
              {[
                { label: "Explain", icon: Bot }, { label: "Refactor", icon: Wand2 },
                { label: "Fix bugs", icon: Circle }, { label: "Add tests", icon: FileCode },
              ].map((q) => (
                <Button key={q.label} variant="outline" size="sm" className="h-7 justify-start gap-1.5 text-[11px]">
                  <q.icon className="h-3 w-3" />{q.label}
                </Button>
              ))}
            </div>

            {/* Chat */}
            <ScrollArea className="flex-1 p-3">
              <div className="mb-3 rounded-lg border border-border bg-muted/30 p-2 text-[10px] text-muted-foreground">
                Context: <code className="text-foreground">{active}</code>
              </div>
              <div className="space-y-3">
                {chat.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${m.role === "user" ? "bg-muted" : "bg-gradient-to-br from-primary to-accent"}`}>
                      {m.role === "user" ? <span className="text-[9px] font-bold">JD</span> : <Bot className="h-3 w-3 text-white" />}
                    </div>
                    <div className={`max-w-[85%] rounded-lg px-2.5 py-2 text-xs leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Composer */}
            <div className="border-t border-border/60 p-2">
              <div className="rounded-lg border border-border bg-background p-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask, edit, generate… (⌘K)"
                  className="h-14 w-full resize-none bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <div className="flex gap-1">
                    <Badge variant="outline" className="h-5 cursor-pointer px-1.5 text-[9px]">@file</Badge>
                    <Badge variant="outline" className="h-5 cursor-pointer px-1.5 text-[9px]">@docs</Badge>
                  </div>
                  <Button size="icon" onClick={send} className="h-6 w-6 bg-gradient-to-r from-primary to-accent">
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Status bar */}
      <div className="flex h-6 shrink-0 items-center gap-3 border-t border-border/60 bg-gradient-to-r from-primary/20 to-accent/20 px-3 text-[10px]">
        <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />main</span>
        <span>0 errors • 2 warnings</span>
        <div className="ml-auto flex items-center gap-3 text-muted-foreground">
          <span>Ln 12, Col 24</span>
          <span>UTF-8</span>
          <span>LF</span>
          <span>{activeFile?.lang ?? "plaintext"}</span>
          <span className="flex items-center gap-1 text-emerald-400"><Circle className="h-2 w-2 fill-current" />AI ready</span>
        </div>
      </div>
    </div>
  );
}
