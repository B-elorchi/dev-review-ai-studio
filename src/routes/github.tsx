import { createFileRoute } from "@tanstack/react-router";
import { Github, GitBranch, GitPullRequest, Webhook, CheckCircle2, XCircle, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { repos } from "@/lib/mock-data";

export const Route = createFileRoute("/github")({
  head: () => ({ meta: [{ title: "GitHub — DevReview AI" }] }),
  component: GithubPage,
});

function GithubPage() {
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
            <div className="mt-2 font-display text-3xl font-bold">12</div>
          </Card>
          <Card className="glass p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Open pull requests</span>
              <GitPullRequest className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 font-display text-3xl font-bold">11</div>
          </Card>
          <Card className="glass p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Webhook status</span>
              <Webhook className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="font-display text-xl font-bold text-emerald-400">Healthy</span></div>
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
                    <Badge variant="outline" className="gap-1 text-[10px]"><GitBranch className="h-3 w-3" />{r.branch}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Last review {r.lastReview} • {r.prs} open PRs</div>
                </div>
                <Badge variant="outline" className={r.status === "passing" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-rose-500/40 bg-rose-500/10 text-rose-400"}>
                  {r.status === "passing" ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                  {r.status}
                </Badge>
                <Button variant="outline" size="sm">View</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
