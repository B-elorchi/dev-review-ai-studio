import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Check, ChevronRight, Container, FileCode, Cloud, Boxes, Workflow,
  Download, Sparkles, Loader2, GitBranch, Github, Cpu, CheckCircle2,
  AlertTriangle, Copy, FolderDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { CodeEditor } from "@/components/code-editor";
import { fetchApi, API_BASE } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/devops")({
  head: () => ({ meta: [{ title: "DevOps Generator — DevReview AI" }] }),
  component: DevOps,
});


type GeneratedFile = { lang: string; content: string };
type GeneratedFiles = Record<string, GeneratedFile>;

type FormState = {
  projectId: string;
  framework: string;
  language: string;
  database: string;
  deployTarget: string;
  nodeVersion: string;
  port: string;
  targets: string[];
};


const FILE_ICONS: Record<string, any> = {
  Dockerfile: Container,
  "docker-compose.yml": Boxes,
  ".github/workflows/ci.yml": Workflow,
  "k8s/deployment.yaml": Cloud,
  "k8s/service.yaml": Cloud,
};

const TARGETS = [
  { id: "dockerfile", label: "Dockerfile", icon: Container, color: "from-sky-500 to-blue-600" },
  { id: "docker-compose", label: "Docker Compose", icon: Boxes, color: "from-violet-500 to-purple-600" },
  { id: "github-actions", label: "GitHub Actions", icon: Workflow, color: "from-emerald-500 to-teal-600" },
  { id: "kubernetes", label: "Kubernetes", icon: Cloud, color: "from-amber-500 to-orange-600" },
];

const FIELD_OPTIONS = {
  framework: ["Node.js / Express", "NestJS", "FastAPI", "Django", "Spring Boot", "Gin", "Laravel", "Rails", "Next.js"],
  language: ["TypeScript", "JavaScript", "Python", "Go", "Java", "Rust", "PHP", "Ruby"],
  database: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "None"],
  deployTarget: ["Docker", "Kubernetes", "AWS ECS", "Fly.io", "Vercel", "Railway", "Render"],
  nodeVersion: ["20", "22", "18", "16"],
};

const DEFAULT_FORM: FormState = {
  projectId: "",
  framework: "Node.js / Express",
  language: "TypeScript",
  database: "PostgreSQL",
  deployTarget: "Docker",
  nodeVersion: "20",
  port: "3000",
  targets: ["dockerfile", "docker-compose", "github-actions"],
};


function StepIndicator({ step }: { step: number }) {
  const steps = ["Configure project", "Generate configs"];
  return (
    <div className="flex items-center gap-3">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = step >= n;
        const done = step > n;
        return (
          <div key={n} className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all
              ${done ? "border-emerald-500 bg-emerald-500 text-white" : active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              {done ? <Check className="h-4 w-4" /> : n}
            </div>
            <span className={`text-sm transition-colors ${active ? "font-medium" : "text-muted-foreground"}`}>{label}</span>
            {n < steps.length && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
}


function TargetToggle({
  targets, onChange,
}: {
  targets: string[];
  onChange: (t: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(targets.includes(id) ? targets.filter((t) => t !== id) : [...targets, id]);
  };
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TARGETS.map((t) => {
        const active = targets.includes(t.id);
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-xs font-medium transition-all
              ${active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${active ? t.color : "bg-muted"} ${active ? "text-white" : ""} transition-all`}>
              <Icon className="h-4 w-4" />
            </div>
            <span>{t.label}</span>
            {active && <Check className="h-3 w-3 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}


function StreamingLog({ lines }: { lines: string[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div className="h-64 overflow-y-auto rounded-lg border border-border/60 bg-[#0e1320] p-4 font-mono text-xs">
      <div className="text-muted-foreground mb-2">$ devreview generate --stream</div>
      {lines.map((line, i) => (
        <div key={i} className="text-emerald-400 leading-relaxed">{line}</div>
      ))}
      <div className="mt-1 flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Generating…</span>
      </div>
      <div ref={bottomRef} />
    </div>
  );
}


function FileViewer({
  generated, active, onSelect, projectId, workspaceId, canPush,
}: {
  generated: GeneratedFiles;
  active: string;
  onSelect: (name: string) => void;
  projectId: string;
  workspaceId: string | null;
  canPush: boolean;
}) {
  const [pushing, setPushing] = useState(false);
  const [commitMsg, setCommitMsg] = useState("chore: add AI-generated DevOps configuration");

  const handleDownloadAll = () => {
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

  const handleDownloadSingle = () => {
    const file = generated[active];
    if (!file) return;
    const blob = new Blob([file.content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = active.split("/").pop() ?? active;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`Downloaded ${active}`);
  };

  const handleCopy = () => {
    const file = generated[active];
    if (!file) return;
    navigator.clipboard.writeText(file.content);
    toast.success("Copied to clipboard");
  };

  const handlePush = async () => {
    if (!projectId || !workspaceId) return;
    setPushing(true);
    try {
      const files = Object.entries(generated).map(([path, f]) => ({ path, content: f.content }));
      const result = await fetchApi("/devops/push", {
        method: "POST",
        body: JSON.stringify({ projectId, files, message: commitMsg }),
      }, workspaceId);

      const failed = (result.results ?? []).filter((r: any) => r.status === "failed");
      if (failed.length === 0) {
        toast.success(`Pushed ${files.length} files to ${result.branch} on ${result.repo}`);
      } else {
        toast.error(`${failed.length} file(s) failed to push`);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Push failed");
    } finally {
      setPushing(false);
    }
  };

  const fileNames = Object.keys(generated);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      <Card className="glass p-2 h-fit">
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Generated Files
        </div>
        {fileNames.map((name) => {
          const Icon = FILE_ICONS[name] ?? FileCode;
          return (
            <button
              key={name}
              onClick={() => onSelect(name)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50 ${active === name ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate text-left font-mono text-xs">{name}</span>
              <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-400 shrink-0" />
            </button>
          );
        })}

        {canPush && projectId && (
          <div className="mt-3 border-t border-border/60 pt-3 space-y-2 px-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Push to GitHub</div>
            <Input
              id="commit-msg-input"
              className="text-xs h-7"
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              placeholder="Commit message"
            />
            <Button
              id="push-to-github-btn"
              size="sm"
              className="w-full h-7 gap-1.5 bg-gradient-to-r from-primary to-accent text-xs"
              onClick={handlePush}
              disabled={pushing || !commitMsg.trim()}
            >
              {pushing ? (
                <><Loader2 className="h-3 w-3 animate-spin" />Pushing…</>
              ) : (
                <><Github className="h-3 w-3" />Push to repo</>
              )}
            </Button>
          </div>
        )}
      </Card>

      <Card className="glass overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{active}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{generated[active]?.lang ?? "text"}</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Button id="copy-file-btn" variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5" />Copy
            </Button>
            <Button id="download-file-btn" variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleDownloadSingle}>
              <Download className="h-3.5 w-3.5" />Download
            </Button>
            <Button id="download-all-btn" variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleDownloadAll}>
              <FolderDown className="h-3.5 w-3.5" />All files
            </Button>
          </div>
        </div>
        <div className="h-[520px]">
          {generated[active] && (
            <CodeEditor value={generated[active].content} language={generated[active].lang} readOnly />
          )}
        </div>
      </Card>
    </div>
  );
}


function DevOps() {
  const { workspaceId } = useAuthStore();
  const [step, setStep] = useState(1);
  const [active, setActive] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [streamingLines, setStreamingLines] = useState<string[]>([]);
  const [generated, setGenerated] = useState<GeneratedFiles>({});
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [projects, setProjects] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    fetchApi("/projects", {}, workspaceId)
      .then((d) => setProjects(d.projects ?? []))
      .catch(console.error);
  }, [workspaceId]);

  const selectedProject = projects.find((p) => p.id === form.projectId) ?? null;
  const canPush = !!selectedProject?.repo_url;

  const setField = (key: keyof FormState, value: string | string[]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleGenerate = async () => {
    if (form.targets.length === 0) {
      toast.error("Select at least one file to generate");
      return;
    }

    setLoading(true);
    setError(null);
    setStreamingLines([]);
    setGenerated({});

    abortRef.current = new AbortController();

    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/devops/generate`, {
        method: "POST",
        signal: abortRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-workspace-id": workspaceId ?? "",
        },
        body: JSON.stringify({
          projectId: form.projectId || undefined,
          framework: form.framework,
          language: form.language,
          database: form.database,
          deployTarget: form.deployTarget,
          nodeVersion: form.nodeVersion,
          port: parseInt(form.port, 10),
          targets: form.targets,
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
          if (line.startsWith("event: delta")) continue;
          if (line.startsWith("data:")) {
            try {
              const d = JSON.parse(line.slice(5).trim());

              if (d.text !== undefined) {
                deltaBuffer += d.text;
                const logLines = deltaBuffer.split("\n").filter((l) => l.trim().length > 0);
                setStreamingLines(logLines.slice(-30));
              }

              if (d.generated) {
                const files = d.generated as GeneratedFiles;
                setGenerated(files);
                const firstFile = Object.keys(files)[0] ?? "";
                setActive(firstFile);
                setStep(2);
                toast.success(`Generated ${Object.keys(files).length} DevOps file(s)!`);
              }

              if (d.message && !d.generated) {
                setError(d.message);
              }
            } catch { }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError("Failed to connect to the generation service. Please try again.");
        toast.error("Generation failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setStep(1);
    setGenerated({});
    setStreamingLines([]);
    setError(null);
    setLoading(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="AI-Powered"
        title="DevOps Generator"
        description="Generate production-ready Dockerfiles, CI/CD pipelines, and Kubernetes manifests in seconds using AI."
      />

      <div className="space-y-6 p-6">
        {/* Step indicator */}
        <StepIndicator step={step} />

        {step === 1 ? (
          <Card className="glass p-6 space-y-6">
            {/* Project selector */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Project (optional — auto-detects stack from GitHub)
              </Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => setField("projectId", v === "none" ? "" : v)}
              >
                <SelectTrigger id="project-select">
                  <SelectValue placeholder="No project selected (use manual settings below)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project — use manual settings</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        {p.repo_url ? <Github className="h-3.5 w-3.5" /> : <Cpu className="h-3.5 w-3.5" />}
                        {p.name}
                        {p.repo_url && (
                          <span className="text-xs text-muted-foreground ml-1">
                            {p.repo_url.replace("https://github.com/", "")}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProject?.repo_url && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <GitBranch className="h-3.5 w-3.5" />
                  GitHub repo detected — AI will use your file tree as context for better results
                </div>
              )}
            </div>

            {/* Stack fields */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(Object.entries({
                framework: "Framework",
                language: "Language",
                database: "Database",
                deployTarget: "Deployment Target",
              }) as [keyof typeof FIELD_OPTIONS, string][]).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
                  <Select value={(form as any)[key]} onValueChange={(v) => setField(key as keyof FormState, v)}>
                    <SelectTrigger id={`${key}-select`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS[key].map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Node / Runtime Version</Label>
                <Select value={form.nodeVersion} onValueChange={(v) => setField("nodeVersion", v)}>
                  <SelectTrigger id="node-version-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_OPTIONS.nodeVersion.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">App Port</Label>
                <Input
                  id="port-input"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port}
                  onChange={(e) => setField("port", e.target.value)}
                  placeholder="3000"
                />
              </div>
            </div>

            {/* Target file toggles */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Files to generate</Label>
              <TargetToggle targets={form.targets} onChange={(t) => setField("targets", t)} />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              {loading && (
                <Button variant="ghost" size="sm" onClick={handleReset}>Cancel</Button>
              )}
              <Button
                id="generate-btn"
                onClick={handleGenerate}
                disabled={loading || form.targets.length === 0}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" />Generate with AI</>
                )}
              </Button>
            </div>

            {/* Streaming log */}
            {loading && streamingLines.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Live output</Label>
                <StreamingLog lines={streamingLines} />
              </div>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-medium">
                  Generated {Object.keys(generated).length} file{Object.keys(generated).length !== 1 ? "s" : ""}
                  {selectedProject && <span className="text-muted-foreground ml-1">for <strong>{selectedProject.name}</strong></span>}
                </span>
              </div>
              <Button id="generate-again-btn" variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />Generate again
              </Button>
            </div>

            <FileViewer
              generated={generated}
              active={active}
              onSelect={setActive}
              projectId={form.projectId}
              workspaceId={workspaceId}
              canPush={canPush}
            />
          </div>
        )}
      </div>
    </div>
  );
}
