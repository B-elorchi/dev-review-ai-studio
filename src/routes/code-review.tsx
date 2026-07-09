import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Play, GitBranch, Clock } from "lucide-react";

export const Route = createFileRoute("/code-review")({
  head: () => ({ meta: [{ title: "Code Review — DevReview AI" }] }),
  component: CodeReviewIndex,
});

function CodeReviewIndex() {
  const { workspaceId } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    fetchApi("/projects", {}, workspaceId)
      .then((d) => setProjects(d.projects ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return (
    <div>
      <PageHeader
        eyebrow="AI Review"
        title="Code Review"
        description="Select a project to start an AI-powered code review."
      />

      <div className="p-6">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="glass h-32 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
            <FolderOpen className="h-10 w-10 opacity-40" />
            <div>
              <p className="font-medium text-foreground">No projects yet</p>
              <p className="text-sm mt-1">Create a project first, then come back to run a review.</p>
            </div>
            <Button size="sm" onClick={() => navigate({ to: "/projects" })}>
              Go to Projects
            </Button>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="glass group cursor-pointer p-5 transition-all hover:border-primary/40 hover:shadow-glow"
                onClick={() => navigate({ to: "/code-review/$projectId", params: { projectId: p.id } })}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  {p.health_score != null && (
                    <Badge
                      variant="outline"
                      className={
                        p.health_score >= 80 ? "border-emerald-500/40 text-emerald-400" :
                        p.health_score >= 60 ? "border-amber-500/40 text-amber-400" :
                        "border-rose-500/40 text-rose-400"
                      }
                    >
                      {p.health_score}/100
                    </Badge>
                  )}
                </div>

                <h3 className="mt-3 font-semibold">{p.name}</h3>
                {p.description && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                )}

                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  {p.default_branch && (
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" /> {p.default_branch}
                    </span>
                  )}
                  {p.updated_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(p.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <Button
                  size="sm"
                  className="mt-4 w-full bg-gradient-to-r from-primary to-accent text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: "/code-review/$projectId", params: { projectId: p.id } });
                  }}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Review
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
