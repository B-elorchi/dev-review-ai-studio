import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertOctagon, AlertTriangle, Info, Lightbulb, Play, FolderOpen, ChevronRight, ChevronDown, Loader2, ArrowLeft } from "lucide-react";
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

const sevConfig = {
  critical: { label: "Critical", className: "bg-rose-500/15 text-rose-400 border-rose-500/40",   icon: AlertOctagon },
  high:     { label: "High",     className: "bg-orange-500/15 text-orange-400 border-orange-500/40", icon: AlertTriangle },
  medium:   { label: "Medium",   className: "bg-amber-500/15 text-amber-400 border-amber-500/40",  icon: Info },
  low:      { label: "Low",      className: "bg-sky-500/15 text-sky-400 border-sky-500/40",        icon: Lightbulb },
} as const;

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
  const { projectId } = Route.useParams();
  const navigate = useNavigate();

  const [project,     setProject]     = useState<any>(null);
  const [fileTree,    setFileTree]    = useState<FNode[]>([]);
  const [sampleFiles, setSampleFiles] = useState<Record<string, { lang: string; content: string }>>({});
  const [activeFile,  setActiveFile]  = useState<{ path: string; lang: string; content: string } | null>(null);
  const [reviewData,  setReviewData]  = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [triggering,  setTriggering]  = useState(false);
  const [polling,     setPolling]     = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);
    setActiveFile(null);
    setFileTree([]);
    setSampleFiles({});
    setReviewData(null);
    stopPolling();

    async function load() {
      try {
        const [projData, filesData, reviewsData] = await Promise.all([
          fetchApi(`/projects/${projectId}`, {}, workspaceId ?? undefined),
          fetchApi(`/projects/${projectId}/files`, {}, workspaceId ?? undefined),
          fetchApi(`/reviews?projectId=${projectId}`, {}, workspaceId ?? undefined),
        ]);

        setProject(projData.project ?? null);

        const tree: FNode[] = filesData.fileTree ?? [];
        const samples: Record<string, { lang: string; content: string }> = filesData.sampleFiles ?? {};
        setFileTree(tree);
        setSampleFiles(samples);

        const firstKey = Object.keys(samples)[0];
        if (firstKey) {
          setActiveFile({ path: firstKey, lang: samples[firstKey].lang, content: samples[firstKey].content });
        }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, projectId]);

  useEffect(() => () => stopPolling(), []);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setPolling(false);
  }

  function startPolling(reviewId: string) {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetchApi(`/reviews/${reviewId}`, {}, workspaceId ?? undefined);
        const r = res.review;
        if (r && (r.status === "completed" || r.status === "failed")) {
          setReviewData(r);
          stopPolling();
          if (r.status === "completed") toast.success(`Review complete — ${r.review_findings?.length ?? 0} findings`);
          else toast.error("Review failed");
        }
      } catch { stopPolling(); }
    }, 3000);
  }

  const handleFileSelect = async (path: string, lang: string, content: string) => {
    if (!sampleFiles[path] && projectId && workspaceId) {
      setActiveFile({ path, lang, content: "Loading..." });
      try {
        const res = await fetchApi(`/projects/${projectId}/files/${encodeURIComponent(path)}`, {}, workspaceId);
        if (res.content) {
          const newContent = res.content;
          setSampleFiles(prev => ({ ...prev, [path]: { lang, content: newContent } }));
          setActiveFile({ path, lang, content: newContent });
        } else {
          setActiveFile({ path, lang, content: "// Empty or binary file" });
        }
      } catch (err) {
        setActiveFile({ path, lang, content: "// Failed to load file" });
      }
    } else {
      setActiveFile({ path, lang, content });
    }
  };

  const triggerReview = async () => {
    if (!projectId) return;
    setTriggering(true);
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
      toast.success("Review queued — analysing your code…");
      setReviewData(res.review);
      startPolling(res.review.id);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to trigger review");
    } finally {
      setTriggering(false);
    }
  };

  const score = reviewData?.score ?? 0;
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (score / 100) * circumference;
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
        title={project ? `${project.name}` : "Code Review"}
        description={project?.repo_url || project?.description || "AI-powered code analysis"}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/code-review" })}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> All Projects
            </Button>

            <Button
              size="sm"
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
              onClick={triggerReview}
              disabled={triggering || polling || loading}
            >
              {triggering ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Queuing…</>
              ) : polling ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Analysing…</>
              ) : (
                <><Play className="mr-1.5 h-4 w-4" />Run review</>
              )}
            </Button>
          </>
        }
      />

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
                onSelect={handleFileSelect}
                active={activeFile?.path ?? ""}
              />
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-xs">
              <span className="font-mono text-muted-foreground truncate">{displayLabel}</span>
              <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                {polling ? "analysing…" : (reviewData?.ref ?? "HEAD")}
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
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" />
                  <stop offset="100%" stopColor="var(--color-accent)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {polling ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <>
                  <span className="font-display text-4xl font-bold gradient-text">{score || "—"}</span>
                  {score > 0 && <span className="text-xs text-muted-foreground">/ 100</span>}
                </>
              )}
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
                <span className="text-foreground font-medium truncate ml-2">{project.name}</span>
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
                  reviewData?.status === "failed"    ? "text-rose-400" :
                  polling ? "text-amber-400" : ""
                }`}>
                  {polling && reviewData?.status !== "completed" ? "analysing…" : (reviewData?.status ?? "No review yet")}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Findings */}
        <div className="space-y-3 lg:col-span-3">
          <h3 className="font-display text-lg font-semibold">
            Findings{findings.length > 0 && (
              <span className="ml-2 text-sm text-muted-foreground font-normal">({findings.length})</span>
            )}
          </h3>

          {polling && findings.length === 0 && (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-8 text-sm text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              AI is analysing your code — findings will appear here automatically…
            </div>
          )}

          {!polling && findings.length === 0 && !loading && (
            <div className="p-8 text-center text-muted-foreground rounded-xl border border-dashed border-border">
              No findings yet. Click <strong>"Run review"</strong> to analyse this project.
            </div>
          )}

          {findings.map((f: any) => {
            const c = sevConfig[f.severity as keyof typeof sevConfig] ?? sevConfig.low;
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
                            handleFileSelect(f.file_path, file?.lang ?? "plaintext", file?.content ?? "");
                          }}
                        >
                          {f.file_path}:{f.line_number}
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
    </div>
  );
}
