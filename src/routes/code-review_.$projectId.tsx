import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertOctagon, AlertTriangle, Info, Lightbulb, Play, FolderOpen,
  ChevronRight, ChevronDown, Loader2, ArrowLeft, CheckCircle2,
  FileCode2, BrainCircuit, ShieldCheck, Copy, Bug,
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

export const Route = createFileRoute("/code-review_/$projectId")({
  head: () => ({ meta: [{ title: "Code Review — DevReview AI" }] }),
  component: CodeReviewProject,
});

// ─── Severity config ──────────────────────────────────────────────────────────

const sevConfig = {
  critical: { label: "Critical", className: "bg-rose-500/15 text-rose-400 border-rose-500/40",       icon: AlertOctagon },
  high:     { label: "High",     className: "bg-orange-500/15 text-orange-400 border-orange-500/40", icon: AlertTriangle },
  medium:   { label: "Medium",   className: "bg-amber-500/15 text-amber-400 border-amber-500/40",    icon: Info },
  low:      { label: "Low",      className: "bg-sky-500/15 text-sky-400 border-sky-500/40",          icon: Lightbulb },
  info:     { label: "Info",     className: "bg-slate-500/15 text-slate-400 border-slate-500/40",    icon: Info },
} as const;

// ─── Live review progress (per-file) ─────────────────────────────────────────

type FileProgress = { path: string; status: "pending" | "reviewing" | "done"; findings: number };
type Progress = {
  status: "running" | "completed" | "failed";
  files_total: number;
  files_done: number;
  current_file: string | null;
  findings_count: number;
  files: FileProgress[];
};

function LiveProgress({ progress, projectName }: { progress: Progress | null; projectName: string }) {
  const total = progress?.files_total ?? 1;
  const done  = progress?.files_done ?? 0;
  const pct   = Math.min(1, done / Math.max(total, 1));

  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center p-10">
      {/* Animated ring */}
      <div className="relative mb-6 h-24 w-24">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--color-border)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke="url(#reviewGrad)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct)}`}
            className="transition-all duration-700"
          />
          <defs>
            <linearGradient id="reviewGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-accent)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold">{done}/{total}</span>
          <span className="text-[9px] uppercase text-muted-foreground">files</span>
        </div>
      </div>

      <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">AI Review in progress</p>
      <h2 className="mb-1 font-display text-xl font-semibold">{projectName}</h2>
      <p className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <BrainCircuit className="h-4 w-4 animate-pulse text-primary" />
        {progress?.current_file
          ? <>Reviewing <span className="font-mono text-primary">{progress.current_file}</span></>
          : "Preparing…"}
        {progress != null && progress.findings_count > 0 && (
          <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
            {progress.findings_count} finding{progress.findings_count > 1 ? "s" : ""} so far
          </Badge>
        )}
      </p>

      {/* Per-file progress list */}
      <div className="w-full max-w-md space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {(progress?.files ?? []).map((f) => (
          <div
            key={f.path}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-all duration-300 ${
              f.status === "reviewing" ? "border-primary/40 bg-primary/8" :
              f.status === "done"      ? "border-emerald-500/25 bg-emerald-500/5" :
              "border-border/40 opacity-45"
            }`}
          >
            {f.status === "done"
              ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              : f.status === "reviewing"
                ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                : <FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span className={`min-w-0 flex-1 truncate font-mono text-xs ${
              f.status === "reviewing" ? "text-foreground" : "text-muted-foreground"
            }`}>
              {f.path}
            </span>
            {f.status === "done" && (
              f.findings > 0
                ? <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px] shrink-0">{f.findings}</Badge>
                : <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] shrink-0">clean</Badge>
            )}
          </div>
        ))}
        {(!progress || progress.files.length === 0) && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Starting review…
          </div>
        )}
      </div>
    </div>
  );
}

// ─── File tree ────────────────────────────────────────────────────────────────

type FNode = { name: string; type: "file" | "folder"; lang?: string; children?: FNode[] };

function FileList({ tree, sampleFiles, onSelect, active, findingCounts, depth = 0, parentPath = "" }: {
  tree: FNode[];
  sampleFiles: Record<string, { lang: string; content: string }>;
  onSelect: (path: string, lang: string, content: string) => void;
  active: string;
  findingCounts: Record<string, number>;
  depth?: number; parentPath?: string;
}) {
  return (
    <>
      {tree.map((node) => {
        const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        if (node.type === "folder") {
          return (
            <FolderNode key={fullPath} node={node} fullPath={fullPath}
              sampleFiles={sampleFiles} onSelect={onSelect} active={active}
              findingCounts={findingCounts} depth={depth} />
          );
        }
        const isActive = active === fullPath;
        const count = findingCounts[fullPath] ?? 0;
        return (
          <button
            key={fullPath}
            onClick={() => {
              const file = sampleFiles[fullPath];
              onSelect(fullPath, file?.lang ?? node.lang ?? "plaintext", file?.content ?? "");
            }}
            className={`flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[11px] hover:bg-muted/40 ${
              isActive ? "bg-primary/15 text-primary" : "text-muted-foreground"
            }`}
            style={{ paddingLeft: 12 + depth * 10 }}
          >
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
            {count > 0 && (
              <span className="ml-auto shrink-0 rounded-full bg-amber-500/20 px-1.5 text-[9px] font-semibold text-amber-400">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

function FolderNode({ node, fullPath, sampleFiles, onSelect, active, findingCounts, depth }: {
  node: FNode; fullPath: string;
  sampleFiles: Record<string, { lang: string; content: string }>;
  onSelect: (path: string, lang: string, content: string) => void;
  active: string; findingCounts: Record<string, number>; depth: number;
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
          active={active} findingCounts={findingCounts} depth={depth + 1} parentPath={fullPath} />
      )}
    </div>
  );
}

// ─── Findings panel (right side) ─────────────────────────────────────────────

function FindingCard({ f, onJump }: { f: any; onJump?: (path: string) => void }) {
  const c    = sevConfig[f.severity as keyof typeof sevConfig] ?? sevConfig.low;
  const Icon = c.icon;
  const isDuplicate = /duplicat/i.test(f.title ?? "");
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3">
      <div className="flex items-start gap-2">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${c.className}`}>
          {isDuplicate ? <Copy className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={`${c.className} text-[9px] px-1.5 py-0`}>{c.label}</Badge>
            {f.line != null && <span className="font-mono text-[10px] text-muted-foreground">L{f.line}</span>}
          </div>
          <p className="mt-1 text-xs font-medium leading-snug">{f.title || f.rule_id}</p>
          {f.suggestion && f.suggestion !== f.title && (
            <p className="mt-1.5 rounded bg-muted/40 p-2 text-[11px] leading-snug text-muted-foreground">
              💡 {f.suggestion}
            </p>
          )}
          {onJump && f.file_path && (
            <button
              onClick={() => onJump(f.file_path)}
              className="mt-1.5 font-mono text-[10px] text-primary hover:underline"
            >
              {f.file_path}{f.line ? `:${f.line}` : ""}
            </button>
          )}
        </div>
      </div>
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
  const [isReviewing, setIsReviewing] = useState(false);
  const [progress,    setProgress]    = useState<Progress | null>(null);
  const [showAllFindings, setShowAllFindings] = useState(false);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
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
        setFileTree(filesData.fileTree ?? []);
        const samples = (filesData.sampleFiles ?? {}) as Record<string, { lang: string; content: string }>;
        setSampleFiles(samples);

        const firstKey = Object.keys(samples)[0];
        if (firstKey) setActiveFile({ path: firstKey, lang: samples[firstKey].lang, content: samples[firstKey].content });

        const reviews: any[] = Array.isArray(reviewsData.data) ? reviewsData.data : [];
        // Latest completed review, or latest of any status
        const completed = reviews.find((rv) => rv.status === "completed");
        setReviewData(completed ?? reviews[0] ?? null);
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

  // ── Auto-start when loaded and no completed review exists ────────────────

  useEffect(() => {
    if (!loading && project && !autoStarted.current && (!reviewData || reviewData.status !== "completed")) {
      autoStarted.current = true;
      triggerReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, reviewData, project]);

  // ── Polling — progress endpoint drives the live UI ────────────────────────

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startPolling(reviewId: string) {
    pollRef.current = setInterval(async () => {
      try {
        const { progress: p } = await fetchApi(`/reviews/${reviewId}/progress`, {}, workspaceId ?? undefined);
        if (p) setProgress(p);

        if (p && (p.status === "completed" || p.status === "failed")) {
          stopPolling();
          const res = await fetchApi(`/reviews/${reviewId}`, {}, workspaceId ?? undefined);
          setReviewData(res.review);
          setIsReviewing(false);
          setProgress(null);
          if (p.status === "completed") {
            toast.success(`Review complete — ${res.review?.review_findings?.length ?? 0} findings`);
          } else {
            toast.error("Review failed — check server logs");
          }
        }
      } catch { /* keep polling; transient network errors are fine */ }
    }, 1500);
  }

  // ── Open file (lazy-load content when not pre-fetched) ───────────────────

  const openFile = async (path: string, lang: string, content: string) => {
    setShowAllFindings(false);
    if (content) { setActiveFile({ path, lang, content }); return; }
    setActiveFile({ path, lang, content: "// Loading…" });
    try {
      const encPath = path.split("/").map(encodeURIComponent).join("/");
      const res = await fetchApi(`/projects/${projectId}/files/${encPath}`, {}, workspaceId ?? undefined);
      const loaded = res.content || "// Empty or binary file";
      setSampleFiles((s) => ({ ...s, [path]: { lang: res.lang ?? lang, content: loaded } }));
      setActiveFile({ path, lang: res.lang ?? lang, content: loaded });
    } catch {
      setActiveFile({ path, lang, content: "// Failed to load file" });
    }
  };

  // ── Trigger review ────────────────────────────────────────────────────────

  const triggerReview = async () => {
    if (!projectId || !workspaceId || isReviewing) return;
    setIsReviewing(true);
    setProgress(null);

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
    } catch (err: any) {
      toast.error(err.message ?? "Failed to start review");
      setIsReviewing(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const score         = reviewData?.score ?? 0;
  const findings: any[] = reviewData?.review_findings ?? [];
  const crit = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  const med  = findings.filter((f) => f.severity === "medium").length;
  const low  = findings.filter((f) => ["low", "info"].includes(f.severity)).length;

  const findingCounts: Record<string, number> = {};
  for (const f of findings) {
    if (f.file_path) findingCounts[f.file_path] = (findingCounts[f.file_path] ?? 0) + 1;
  }

  const activeFindings = showAllFindings
    ? findings
    : findings.filter((f) => f.file_path === activeFile?.path);

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
                {reviewData?.status === "completed" ? "Re-run review" : "Run review"}
              </Button>
            )}
          </>
        }
      />

      {/* ── Live review progress ─────────────────────────────────────────── */}
      {isReviewing && (
        <div className="mx-6 mb-6">
          <Card className="glass overflow-hidden p-0">
            <LiveProgress progress={progress} projectName={project?.name ?? "Project"} />
          </Card>
        </div>
      )}

      {/* ── Results: file tree | editor | findings panel ─────────────────── */}
      {!isReviewing && (
        <div className="space-y-6 p-6">
          {/* Score strip */}
          <Card className="glass flex flex-wrap items-center gap-6 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" stroke="var(--color-border)" strokeWidth="6" fill="none" />
                  <circle cx="32" cy="32" r="26" stroke="url(#scoreGrad)" strokeWidth="6" fill="none"
                    strokeDasharray={2 * Math.PI * 26}
                    strokeDashoffset={2 * Math.PI * 26 * (1 - score / 100)}
                    strokeLinecap="round" className="transition-all duration-1000" />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="var(--color-accent)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-sm font-bold gradient-text">{score || "—"}</span>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Score</p>
                <p className="text-sm font-medium">
                  {reviewData?.status === "completed" ? `${findings.length} finding${findings.length !== 1 ? "s" : ""}`
                    : reviewData?.status === "failed" ? "Review failed"
                    : "No review yet"}
                </p>
              </div>
            </div>

            <div className="flex gap-5 text-center text-xs">
              <div><div className="font-display text-lg font-bold text-rose-400">{crit}</div><div className="text-muted-foreground">Critical</div></div>
              <div><div className="font-display text-lg font-bold text-orange-400">{high}</div><div className="text-muted-foreground">High</div></div>
              <div><div className="font-display text-lg font-bold text-amber-400">{med}</div><div className="text-muted-foreground">Medium</div></div>
              <div><div className="font-display text-lg font-bold text-sky-400">{low}</div><div className="text-muted-foreground">Low</div></div>
            </div>

            <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
              {project?.default_branch && <span>Branch: <span className="text-foreground">{project.default_branch}</span></span>}
              {reviewData?.completed_at && <span>Reviewed: <span className="text-foreground">{new Date(reviewData.completed_at).toLocaleString()}</span></span>}
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
          </Card>

          {/* 3-pane layout */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[190px_1fr_340px] lg:grid-cols-[190px_1fr]">
            {/* File tree */}
            <Card className="glass overflow-hidden p-0">
              <div className="border-b border-border/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Files
              </div>
              <div className="max-h-[540px] overflow-y-auto py-1">
                {fileTree.length > 0 ? (
                  <FileList
                    tree={fileTree}
                    sampleFiles={sampleFiles}
                    onSelect={openFile}
                    active={activeFile?.path ?? ""}
                    findingCounts={findingCounts}
                  />
                ) : (
                  <p className="p-3 text-xs text-muted-foreground">{loading ? "Loading…" : "No files"}</p>
                )}
              </div>
            </Card>

            {/* Editor */}
            <Card className="glass flex min-h-[560px] flex-col overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-xs">
                <span className="truncate font-mono text-muted-foreground">{displayLabel}</span>
                <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                  {reviewData?.ref ?? "HEAD"}
                </Badge>
              </div>
              <div className="min-h-0 flex-1">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading files…
                  </div>
                ) : (
                  <CodeEditor language={displayLang} value={displayCode} readOnly />
                )}
              </div>
            </Card>

            {/* Findings panel */}
            <Card className="glass flex max-h-[600px] flex-col overflow-hidden p-0 xl:col-span-1 lg:col-span-2 xl:col-auto">
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Bug className="h-3.5 w-3.5" />
                  {showAllFindings ? "All findings" : "Findings in this file"}
                  <span className="rounded-full bg-muted px-1.5 text-[9px]">{activeFindings.length}</span>
                </span>
                <button
                  onClick={() => setShowAllFindings(!showAllFindings)}
                  className="text-[10px] text-primary hover:underline"
                >
                  {showAllFindings ? "This file" : `All (${findings.length})`}
                </button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {activeFindings.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400/60" />
                    <p className="text-xs">
                      {findings.length === 0
                        ? (reviewData?.status === "completed" ? "No issues found — clean code! 🎉" : "Run a review to see findings.")
                        : "No issues in this file. Switch to \"All\" to see everything."}
                    </p>
                  </div>
                )}
                {activeFindings.map((f: any) => (
                  <FindingCard
                    key={f.id}
                    f={f}
                    onJump={showAllFindings ? (path) => {
                      const file = sampleFiles[path];
                      openFile(path, file?.lang ?? "plaintext", file?.content ?? "");
                    } : undefined}
                  />
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
