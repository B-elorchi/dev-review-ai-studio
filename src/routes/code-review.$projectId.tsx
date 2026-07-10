import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertOctagon, AlertTriangle, Info, Lightbulb, Play, FolderOpen,
  ChevronRight, ChevronDown, Loader2, ArrowLeft, CheckCircle2,
  FileCode2, Search, BrainCircuit, ListChecks, ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { CodeEditor } from "@/components/code-editor";
import { useEffect, useRef, useState } from "react";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

export const Route = createFileRoute("/code-review/$projectId")({
  head: () => ({ meta: [{ title: "Code Review — DevReview AI" }] }),
  component: CodeReviewProject,
});

// ─── Severity config ──────────────────────────────────────────────────────────

const sevConfig = {
  critical: { label: "Critical", className: "bg-rose-500/15 text-rose-400 border-rose-500/40",     icon: AlertOctagon },
  high:     { label: "High",     className: "bg-orange-500/15 text-orange-400 border-orange-500/40", icon: AlertTriangle },
  medium:   { label: "Medium",   className: "bg-amber-500/15 text-amber-400 border-amber-500/40",   icon: Info },
  low:      { label: "Low",      className: "bg-sky-500/15 text-sky-400 border-sky-500/40",          icon: Lightbulb },
} as const;

// ─── Review progress steps ────────────────────────────────────────────────────

const STEPS = [
  { id: "fetch",    icon: FileCode2,    label: "Fetching project files",      desc: "Reading source code from repository" },
  { id: "scan",     icon: Search,       label: "Scanning code structure",      desc: "Mapping files, imports and dependencies" },
  { id: "analyze",  icon: BrainCircuit, label: "AI analysis in progress",      desc: "Running deep code review with GPT-4.1" },
  { id: "findings", icon: ListChecks,   label: "Generating findings report",   desc: "Categorising bugs, security issues and improvements" },
  { id: "done",     icon: ShieldCheck,  label: "Review complete",              desc: "Results ready" },
] as const;

type StepId = typeof STEPS[number]["id"];

function ReviewProgress({ step, projectName }: { step: StepId; projectName: string }) {
  const currentIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center p-10">
      {/* Animated ring */}
      <div className="relative mb-8 h-24 w-24">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--color-border)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke="url(#reviewGrad)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - (currentIdx + 1) / STEPS.length)}`}
            className="transition-all duration-700"
          />
          <defs>
            <linearGradient id="reviewGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-accent)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <BrainCircuit className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </div>

      <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Reviewing</p>
      <h2 className="mb-8 font-display text-xl font-semibold">{projectName}</h2>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-3">
        {STEPS.filter((s) => s.id !== "done").map((s, idx) => {
          const done    = idx < currentIdx;
          const active  = idx === currentIdx;
          const pending = idx > currentIdx;
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-500 ${
                active  ? "border-primary/40 bg-primary/8 shadow-[0_0_20px_-8px_var(--primary)]" :
                done    ? "border-emerald-500/25 bg-emerald-500/5" :
                "border-border/40 opacity-40"
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                active ? "bg-primary/20 text-primary" :
                done   ? "bg-emerald-500/20 text-emerald-400" :
                "bg-muted/40 text-muted-foreground"
              }`}>
                {done
                  ? <CheckCircle2 className="h-4 w-4" />
                  : active
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Icon className="h-4 w-4" />
                }
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${active ? "text-foreground" : done ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {s.label}
                </p>
                {active && (
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                )}
              </div>
              {active && (
                <div className="ml-auto flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-primary"
                      style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── File tree ────────────────────────────────────────────────────────────────

type FNode = { name: string; type: "file" | "folder"; lang?: string; children?: FNode[] };

function FileList({ tree, sampleFiles, onSelect, active, depth = 0, parentPath = "" }: {
  tree: FNode[];
  sampleFiles: Record<string, { lang: string; content: string }>;
  onSelect: (path: string, lang: string, content: string) => void;
  active: string; depth?: number; parentPath?: string;
}) {
  return (
    <>
      {tree.map((node) => {
        const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        if (node.type === "folder") {
          return (
            <FolderNode key={fullPath} node={node} fullPath={fullPath}
              sampleFiles={sampleFiles} onSelect={onSelect} active={active} depth={depth} />
          );
        }
        const isActive = active === fullPath;
        return (
          <button
            key={fullPath}
            onClick={() => {
              const file = sampleFiles[fullPath];
              onSelect(fullPath, file?.lang ?? node.lang ?? "plaintext", file?.content ?? "");
            }}
            className={`flex w-full items-center gap-1.5 py-1 text-left text-[11px] hover:bg-muted/40 ${
              isActive ? "bg-primary/15 text-primary" : "text-muted-foreground"
            }`}
            style={{ paddingLeft: 12 + depth * 10 }}
          >
            {node.name}
          </button>
        );
      })}
    </>
  );
}

function FolderNode({ node, fullPath, sampleFiles, onSelect, active, depth }: {
  node: FNode; fullPath: string;
  sampleFiles: Record<string, { lang: string; content: string }>;
  onSelect: (path: string, lang: string, content: string) => void;
  active: string; depth: number;
}) {
  const [open, setOpen] = useState(depth < 1);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 py-1 text-[11px] text-muted-foreground hover:bg-muted/40"
        style={{ paddingLeft: 12 + depth * 10 }}
      >
        {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <FolderOpen className="h-3 w-3 shrink-0" />
        {node.name}
      </button>
      {open && node.children && (
        <FileList tree={node.children} sampleFiles={sampleFiles} onSelect={onSelect}
          active={active} depth={depth + 1} parentPath={fullPath} />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function CodeReviewProject() {
  const { workspaceId } = useAuthStore();
  const { projectId }   = Route.useParams();
  const navigate        = useNavigate();

  const [project,     setProject]     = useState<any>(null);
  const [fileTree,    setFileTree]    = useState<FNode[]>([]);
  const [sampleFiles, setSampleFiles] = useState<Record<string, { lang: string; content: string }>>({});
  const [activeFile,  setActiveFile]  = useState<{ path: string; lang: string; content: string } | null>(null);
  const [reviewData,  setReviewData]  = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [reviewStep,  setReviewStep]  = useState<StepId | null>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStarted = useRef(false);

  // ── Load project + files ──────────────────────────────────────────────────

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);
    autoStarted.current = false;

    async function load() {
      try {
        const [projData, filesData, reviewsData] = await Promise.all([
          fetchApi(`/projects/${projectId}`, {}, workspaceId ?? undefined),
          fetchApi(`/projects/${projectId}/files`, {}, workspaceId ?? undefined),
          fetchApi(`/reviews?projectId=${projectId}`, {}, workspaceId ?? undefined),
        ]);

        setProject(projData.project ?? null);

        const tree: FNode[]    = filesData.fileTree ?? [];
        const samples          = (filesData.sampleFiles ?? {}) as Record<string, { lang: string; content: string }>;
        setFileTree(tree);
        setSampleFiles(samples);

        const firstKey = Object.keys(samples)[0];
        if (firstKey) setActiveFile({ path: firstKey, lang: samples[firstKey].lang, content: samples[firstKey].content });

        const reviews: any[] = Array.isArray(reviewsData.data) ? reviewsData.data : [];
        if (reviews.length > 0) setReviewData(reviews[0]);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load project");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, projectId]);

  // ── Auto-start when loaded and no existing review ────────────────────────

  useEffect(() => {
    if (!loading && !reviewData && project && !autoStarted.current) {
      autoStarted.current = true;
      triggerReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, reviewData, project]);

  // ── Polling ───────────────────────────────────────────────────────────────

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startPolling(reviewId: string) {
    setReviewStep("analyze");
    let tick = 0;
    pollRef.current = setInterval(async () => {
      tick++;
      // Advance visual steps over time
      if (tick === 3) setReviewStep("findings");

      try {
        const res = await fetchApi(`/reviews/${reviewId}`, {}, workspaceId ?? undefined);
        const r   = res.review;
        if (r && (r.status === "completed" || r.status === "failed")) {
          stopPolling();
          setReviewData(r);
          setReviewStep(null);
          if (r.status === "completed") {
            toast.success(`Review complete — ${r.review_findings?.length ?? 0} findings`);
          } else {
            toast.error("Review failed — check server logs");
          }
        }
      } catch { stopPolling(); setReviewStep(null); }
    }, 3000);
  }

  // ── Trigger review ────────────────────────────────────────────────────────

  const triggerReview = async () => {
    if (!projectId || !workspaceId || reviewStep) return;

    setReviewStep("fetch");
    // Brief pause to show "fetch" step visually
    await new Promise((r) => setTimeout(r, 600));
    setReviewStep("scan");
    await new Promise((r) => setTimeout(r, 800));

    try {
      const diffParts = Object.entries(sampleFiles).map(
        ([path, { content }]) => `=== ${path} ===\n${content}`,
      );
      const diff = diffParts.length ? diffParts.join("\n\n") : undefined;

      const res = await fetchApi(
        `/projects/${projectId}/reviews`,
        { method: "POST", body: JSON.stringify({ ref: "HEAD", diff }) },
        workspaceId,
      );

      startPolling(res.review.id);
      setReviewData(res.review);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to start review");
      setReviewStep(null);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const isReviewing   = reviewStep !== null;
  const score         = reviewData?.score ?? 0;
  const circumference = 2 * Math.PI * 56;
  const offset        = circumference - (score / 100) * circumference;
  const findings: any[] = reviewData?.review_findings ?? [];
  const crit = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  const med  = findings.filter((f) => f.severity === "medium").length;

  const displayCode  = activeFile?.content ?? "// Select a file from the tree to view it.";
  const displayLang  = activeFile?.lang    ?? "typescript";
  const displayLabel = activeFile?.path    ?? (loading ? "Loading files…" : "No files found");

  return (
    <div>
      <PageHeader
        eyebrow="AI Review"
        title={project ? project.name : "Code Review"}
        description={project?.repo_url || project?.description || "AI-powered code analysis"}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/code-review" })}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> All Projects
            </Button>
            {!isReviewing && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-accent text-white"
                onClick={triggerReview}
                disabled={loading}
              >
                <Play className="mr-1.5 h-4 w-4" />
                {reviewData ? "Re-run review" : "Run review"}
              </Button>
            )}
          </>
        }
      />

      {/* ── Review in progress overlay ─────────────────────────────────── */}
      {isReviewing && (
        <div className="mx-6 mb-6">
          <Card className="glass overflow-hidden p-0">
            <ReviewProgress step={reviewStep!} projectName={project?.name ?? "Project"} />
          </Card>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────── */}
      {!isReviewing && (
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
          {/* File tree + editor */}
          <Card className="glass overflow-hidden lg:col-span-2 p-0 flex min-h-[500px]">
            {fileTree.length > 0 && (
              <div className="w-44 shrink-0 border-r border-border/60 overflow-y-auto">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  Files
                </div>
                <FileList
                  tree={fileTree}
                  sampleFiles={sampleFiles}
                  onSelect={(path, lang, content) => setActiveFile({ path, lang, content })}
                  active={activeFile?.path ?? ""}
                />
              </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-xs">
                <span className="font-mono text-muted-foreground truncate">{displayLabel}</span>
                <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                  {reviewData?.ref ?? "HEAD"}
                </Badge>
              </div>
              <div className="flex-1 h-[460px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading files…
                  </div>
                ) : (
                  <CodeEditor language={displayLang} value={displayCode} readOnly />
                )}
              </div>
            </div>
          </Card>

          {/* Score ring */}
          <Card className="glass flex flex-col items-center justify-center p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall Score</div>
            <div className="relative my-4 h-36 w-36">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" stroke="var(--color-border)" strokeWidth="10" fill="none" />
                <circle cx="64" cy="64" r="56" stroke="url(#scoreGrad)" strokeWidth="10" fill="none"
                  strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                  className="transition-all duration-1000" />
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" />
                    <stop offset="100%" stopColor="var(--color-accent)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-4xl font-bold gradient-text">{score || "—"}</span>
                {score > 0 && <span className="text-xs text-muted-foreground">/ 100</span>}
              </div>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 text-center text-xs">
              <div><div className="font-display text-lg font-bold text-rose-400">{crit}</div><div className="text-muted-foreground">Critical</div></div>
              <div><div className="font-display text-lg font-bold text-orange-400">{high}</div><div className="text-muted-foreground">High</div></div>
              <div><div className="font-display text-lg font-bold text-amber-400">{med}</div><div className="text-muted-foreground">Medium</div></div>
            </div>

            {project && (
              <div className="mt-4 w-full border-t border-border/60 pt-4 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Project</span>
                  <span className="font-medium text-foreground truncate ml-2">{project.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Branch</span>
                  <span>{project.default_branch ?? "main"}</span>
                </div>
                {reviewData?.created_at && (
                  <div className="flex justify-between">
                    <span>Reviewed</span>
                    <span>{new Date(reviewData.created_at).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className={`capitalize font-medium ${
                    reviewData?.status === "completed" ? "text-emerald-400" :
                    reviewData?.status === "failed"    ? "text-rose-400" : ""
                  }`}>
                    {reviewData?.status ?? "No review yet"}
                  </span>
                </div>
              </div>
            )}

            {!reviewData && !loading && (
              <Button
                size="sm"
                className="mt-6 w-full bg-gradient-to-r from-primary to-accent text-white"
                onClick={triggerReview}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" /> Run AI Review
              </Button>
            )}
          </Card>

          {/* Findings */}
          <div className="space-y-3 lg:col-span-3">
            <h3 className="font-display text-lg font-semibold">
              Findings
              {findings.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">({findings.length})</span>
              )}
            </h3>

            {findings.length === 0 && !loading && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                {reviewData
                  ? "No issues found — great code quality!"
                  : "Click \"Run review\" to analyse this project."}
              </div>
            )}

            {findings.map((f: any) => {
              const c    = sevConfig[f.severity as keyof typeof sevConfig] ?? sevConfig.low;
              const Icon = c.icon;
              return (
                <Card key={f.id} className="glass overflow-hidden p-0">
                  <div className="flex items-start gap-4 p-5">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${c.className}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={c.className}>{c.label}</Badge>
                        <h4 className="font-semibold">{f.title || f.rule_id}</h4>
                        {f.file_path && (
                          <button
                            className="ml-auto font-mono text-xs text-muted-foreground hover:text-primary"
                            onClick={() => {
                              const file = sampleFiles[f.file_path];
                              if (file) setActiveFile({ path: f.file_path, lang: file.lang, content: file.content });
                            }}
                          >
                            {f.file_path}{f.line ? `:${f.line}` : ""}
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{f.message}</p>
                      {f.suggestion && (
                        <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
                          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Recommendation</span>
                          <p className="mt-1 text-muted-foreground">{f.suggestion}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
