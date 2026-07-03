import { createFileRoute } from "@tanstack/react-router";
import { Github, GitBranch, GitPullRequest, Webhook, CheckCircle2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/github")({
  head: () => ({ meta: [{ title: "GitHub — DevReview AI" }] }),
  component: GithubPage,
});

function GithubPage() {
  const { workspaceId } = useAuthStore();
  const [repos, setRepos] = useState<any[]>([]);
  const [ghStats, setGhStats] = useState<any>({ open_prs: 0, webhook_status: "—", installed: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [repoRes, statsRes] = await Promise.all([
          fetchApi("/integrations/github/repos"),
          fetchApi(`/integrations/github/stats${workspaceId ? `?workspaceId=${workspaceId}` : ""}`),
        ]);
        if (repoRes?.repos) setRepos(repoRes.repos);
        if (statsRes?.stats) setGhStats(statsRes.stats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workspaceId]);

  return (
    <div>
      <PageHeader
        eyebrow="Integration"
        title="GitHub"
        description="Connect repositories, review pull requests, and receive webhook events."
        actions={
          <>
            <Button variant="outline" size="sm"><Webhook className="mr-1.5 h-4 w-4" />Webhook settings</Button>
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <Plus className="mr-1.5 h-4 w-4" />Connect repo
            </Button>
          </>
        }
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="glass p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Connected repos</span>
              <Github className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 font-display text-3xl font-bold">{repos.filter(r => r.isImported !== false).length}</div>
          </Card>
          <Card className="glass p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Open pull requests</span>
              <GitPullRequest className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 font-display text-3xl font-bold">{ghStats.open_prs}</div>
          </Card>
          <Card className="glass p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Webhook status</span>
              <Webhook className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${ghStats.webhook_status === "Healthy" ? "bg-emerald-400" : "bg-muted-foreground"}`} />
              <span className={`font-display text-xl font-bold ${ghStats.webhook_status === "Healthy" ? "text-emerald-400" : "text-muted-foreground"}`}>{ghStats.webhook_status}</span>
            </div>
          </Card>
        </div>

        <Card className="glass overflow-hidden p-0">
          <div className="border-b border-border/60 px-5 py-3"><h3 className="font-semibold">Repositories</h3></div>
          <div className="divide-y divide-border/60">
            {repos.map((r) => (
              <div key={r.name} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                  <Github className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{r.name}</span>
                    <Badge variant="outline" className="gap-1 text-[10px]"><GitBranch className="h-3 w-3" />{r.language || 'main'}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Updated {r.lastUpdated} • ⭐ {r.stars}</div>
                </div>
                {r.isImported !== false ? (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Plus className="mr-1 h-3 w-3" />
                    Available
                  </Badge>
                )}
                <Button variant={r.isImported !== false ? "outline" : "default"} size="sm">
                  {r.isImported !== false ? "Settings" : "Import"}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
