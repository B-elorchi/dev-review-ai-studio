import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen, X, Terminal as TerminalIcon,
  Send, Bot, Shield, Compass, Book, Play, Sparkles, ArrowLeft,
} from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fileTree, sampleFiles } from "@/lib/mock-data";
import { CodeEditor } from "@/components/code-editor";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({ meta: [{ title: "Workspace — DevReview AI" }] }),
  component: Workspace,
});

type Node = { name: string; type: "file" | "folder"; lang?: string; children?: Node[] };

function FileTreeNode({ node, depth, path, onOpen, active }: { node: Node; depth: number; path: string; onOpen: (p: string, lang?: string) => void; active: string }) {
  const [open, setOpen] = useState(depth < 2);
  const fullPath = path ? `${path}/${node.name}` : node.name;
  if (node.type === "folder") {
    return (
      <div>
        <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-1 rounded px-2 py-0.5 text-sm hover:bg-muted/50" style={{ paddingLeft: depth * 12 + 8 }}>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {open ? <FolderOpen className="h-3.5 w-3.5 text-primary" /> : <Folder className="h-3.5 w-3.5 text-primary" />}
          <span>{node.name}</span>
        </button>
        {open && node.children?.map((c) => <FileTreeNode key={c.name} node={c} depth={depth + 1} path={fullPath} onOpen={onOpen} active={active} />)}
      </div>
    );
  }
  return (
    <button onClick={() => onOpen(fullPath, node.lang)} className={`flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-sm hover:bg-muted/50 ${active === fullPath ? "bg-primary/15 text-primary" : ""}`} style={{ paddingLeft: depth * 12 + 20 }}>
      <File className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{node.name}</span>
    </button>
  );
}

const agentTabs = [
  { id: "review", label: "Review", icon: Shield, color: "from-blue-500 to-cyan-500" },
  { id: "devops", label: "DevOps", icon: Sparkles, color: "from-purple-500 to-pink-500" },
  { id: "architect", label: "Architect", icon: Compass, color: "from-amber-500 to-orange-500" },
  { id: "docs", label: "Docs", icon: Book, color: "from-emerald-500 to-teal-500" },
];

const seedMessages: Record<string, { role: "agent" | "user"; text: string }[]> = {
  review: [
    { role: "agent", text: "Hi! I'm your Code Reviewer. I scanned the latest commit and found 2 high-severity issues." },
    { role: "user", text: "Show me the worst one." },
    { role: "agent", text: "SQL injection in `controllers/user.ts:42`. Want me to draft a fix using parameterized queries?" },
  ],
  devops: [{ role: "agent", text: "Ready to generate a Dockerfile, CI pipeline, or Kubernetes manifests. What's the target?" }],
  architect: [{ role: "agent", text: "I noticed your auth service mixes business logic in controllers. Consider extracting a service layer." }],
  docs: [{ role: "agent", text: "Want me to generate API docs from your route definitions?" }],
};

function Workspace() {
  const { id } = Route.useParams();
  const [tabs, setTabs] = useState<{ path: string; lang: string }[]>([
    { path: "src/index.ts", lang: "typescript" },
    { path: "src/controllers/auth.ts", lang: "typescript" },
    { path: "Dockerfile", lang: "dockerfile" },
  ]);
  const [active, setActive] = useState("src/index.ts");
  const [bottomTab, setBottomTab] = useState("terminal");
  const [agentTab, setAgentTab] = useState("review");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(seedMessages);

  const openFile = (path: string, lang = "typescript") => {
    if (!tabs.find((t) => t.path === path)) setTabs([...tabs, { path, lang }]);
    setActive(path);
  };
  const closeTab = (path: string) => {
    const next = tabs.filter((t) => t.path !== path);
    setTabs(next);
    if (active === path && next.length) setActive(next[0].path);
  };
  const current = sampleFiles[active] ?? { lang: "plaintext", content: "// empty" };

  const send = () => {
    if (!input.trim()) return;
    setMessages({
      ...messages,
      [agentTab]: [
        ...(messages[agentTab] ?? []),
        { role: "user" as const, text: input },
        { role: "agent" as const, text: "Working on it… ⚡" },
      ],
    });
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link to="/projects"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="text-muted-foreground">Projects /</span>
          <span className="font-medium">{id}</span>
          <span className="ml-2 rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">main</span>
        </div>
        <Button size="sm" className="h-7 bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <Play className="mr-1 h-3 w-3" /> Run analysis
        </Button>
      </div>

      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* File explorer */}
        <ResizablePanel defaultSize={18} minSize={12}>
          <div className="flex h-full flex-col border-r border-border/60 bg-sidebar/50">
            <div className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Explorer</div>
            <ScrollArea className="flex-1 p-1">
              {fileTree.map((n) => <FileTreeNode key={n.name} node={n as Node} depth={0} path="" onOpen={openFile} active={active} />)}
            </ScrollArea>
          </div>
        </ResizablePanel>
        <ResizableHandle />

        {/* Editor + terminal */}
        <ResizablePanel defaultSize={56}>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel defaultSize={70}>
              <div className="flex h-full flex-col bg-[#0e1320]">
                <div className="flex h-9 items-center gap-0.5 overflow-x-auto border-b border-border/60 bg-background/40 px-1">
                  {tabs.map((t) => (
                    <button key={t.path} onClick={() => setActive(t.path)} className={`group flex h-7 items-center gap-2 rounded-t px-3 text-xs ${active === t.path ? "bg-[#0e1320] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      <File className="h-3 w-3" />
                      <span>{t.path.split("/").pop()}</span>
                      <X className="h-3 w-3 opacity-0 hover:text-foreground group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); closeTab(t.path); }} />
                    </button>
                  ))}
                </div>
                <div className="flex-1">
                  <CodeEditor value={current.content} language={current.lang} />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={30} minSize={15}>
              <div className="flex h-full flex-col bg-background">
                <Tabs value={bottomTab} onValueChange={setBottomTab} className="flex h-full flex-col">
                  <TabsList className="h-9 w-full justify-start rounded-none border-b border-border/60 bg-transparent px-2">
                    <TabsTrigger value="terminal" className="gap-1.5 data-[state=active]:bg-muted/50"><TerminalIcon className="h-3 w-3" />Terminal</TabsTrigger>
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                    <TabsTrigger value="build">Build Output</TabsTrigger>
                  </TabsList>
                  <TabsContent value="terminal" className="flex-1 overflow-auto p-3 font-mono text-xs">
                    <div className="text-muted-foreground">$ npm run dev</div>
                    <div className="text-emerald-400">✓ Compiled successfully in 1.2s</div>
                    <div className="text-muted-foreground">🚀 auth-service listening on :3000</div>
                    <div className="text-sky-400">▶ Connected to postgres://localhost:5432/auth</div>
                    <div className="mt-2 flex items-center gap-1 text-foreground">
                      <span className="text-primary">jane@devreview</span>
                      <span className="text-muted-foreground">~/auth-service $</span>
                      <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-primary" />
                    </div>
                  </TabsContent>
                  <TabsContent value="logs" className="flex-1 overflow-auto p-3 font-mono text-xs text-muted-foreground">
                    <div>[12:42:11] INFO  Server started</div>
                    <div>[12:42:14] INFO  GET /health 200 4ms</div>
                    <div>[12:43:02] WARN  Rate limit threshold reached for ip 10.0.0.4</div>
                  </TabsContent>
                  <TabsContent value="build" className="flex-1 overflow-auto p-3 font-mono text-xs">
                    <div className="text-emerald-400">✓ Build completed in 4.7s</div>
                    <div className="text-muted-foreground">Bundle size: 142 KB gzipped</div>
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle />

        {/* Agents panel */}
        <ResizablePanel defaultSize={26} minSize={20}>
          <div className="flex h-full flex-col border-l border-border/60 bg-sidebar/50">
            <Tabs value={agentTab} onValueChange={setAgentTab} className="flex h-full flex-col">
              <div className="border-b border-border/60 p-2">
                <TabsList className="grid w-full grid-cols-4 bg-muted/30">
                  {agentTabs.map((a) => (
                    <TabsTrigger key={a.id} value={a.id} className="text-xs"><a.icon className="h-3 w-3" /></TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {agentTabs.map((a) => (
                <TabsContent key={a.id} value={a.id} className="m-0 flex flex-1 flex-col">
                  <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${a.color} text-white shadow-lg`}>
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{a.label} Agent</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                      </div>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-3">
                      {(messages[a.id] ?? []).map((m, i) => (
                        <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${m.role === "user" ? "bg-muted" : `bg-gradient-to-br ${a.color}`}`}>
                            {m.role === "user" ? <span className="text-[10px] font-bold">JD</span> : <Bot className="h-3 w-3 text-white" />}
                          </div>
                          <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="border-t border-border/60 p-3">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={`Ask the ${a.label} agent…`} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                      <Button size="icon" onClick={send} className="h-7 w-7 bg-gradient-to-r from-primary to-accent">
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
