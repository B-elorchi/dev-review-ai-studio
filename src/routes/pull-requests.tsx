import { createFileRoute } from "@tanstack/react-router";
import { GitPullRequest, GitMerge, CheckCircle2, XCircle, Clock, MessageSquare, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/pull-requests")({
  head: () => ({ meta: [{ title: "Pull Requests — DevReview AI" }] }),
  component: PRPage,
});

const prs = [
  { id: 142, repo: "acme/web", title: "feat(auth): migrate to passkey-based login flow", author: "JD", branch: "feat/passkeys", status: "open", score: 87, comments: 12, additions: 482, deletions: 191, time: "12 minutes ago" },
  { id: 141, repo: "acme/api", title: "fix(billing): handle Stripe webhook race condition", author: "MK", branch: "fix/stripe-race", status: "review", score: 94, comments: 6, additions: 78, deletions: 24, time: "1 hour ago" },
  { id: 139, repo: "acme/web", title: "chore: bump dependencies for June security advisory", author: "AR", branch: "chore/deps", status: "merged", score: 98, comments: 3, additions: 1244, deletions: 1188, time: "3 hours ago" },
  { id: 138, repo: "acme/infra", title: "feat: add multi-region failover for Postgres", author: "SL", branch: "feat/failover", status: "open", score: 72, comments: 18, additions: 612, deletions: 47, time: "Yesterday" },
  { id: 137, repo: "acme/mobile", title: "perf: lazy load heavy components on cold start", author: "PS", branch: "perf/lazy", status: "closed", score: 64, comments: 9, additions: 320, deletions: 410, time: "2 days ago" },
];

const statusMap = {
  open: { label: "Open", icon: GitPullRequest, cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  review: { label: "In review", icon: Clock, cls: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  merged: { label: "Merged", icon: GitMerge, cls: "border-purple-500/30 bg-purple-500/10 text-purple-400" },
  closed: { label: "Closed", icon: XCircle, cls: "border-red-500/30 bg-red-500/10 text-red-400" },
} as const;

function PRPage() {
  return (
    <div>
      <PageHeader eyebrow="GitHub" title="Pull Requests" description="AI-reviewed PRs across all your repositories." />

      <div className="grid gap-4 p-6">
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: "Open", value: 14, color: "text-emerald-400" },
            { label: "In review", value: 6, color: "text-amber-400" },
            { label: "Merged this week", value: 38, color: "text-purple-400" },
            { label: "Avg. review time", value: "27s", color: "text-primary" },
          ].map((s) => (
            <Card key={s.label} className="glass p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`mt-1 font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input placeholder="Search pull requests…" className="max-w-sm" />
          <Button variant="outline" size="sm"><Filter className="mr-1.5 h-3.5 w-3.5" />All repos</Button>
          <Button variant="outline" size="sm">Status: any</Button>
          <Button variant="outline" size="sm">Author: anyone</Button>
        </div>

        <Card className="glass divide-y divide-border/60 p-0">
          {prs.map((pr) => {
            const S = statusMap[pr.status as keyof typeof statusMap];
            return (
              <div key={pr.id} className="flex items-center gap-4 p-4 transition hover:bg-muted/20">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${S.cls.replace("border-", "").replace("text-", "text-")} bg-opacity-20`}>
                  <S.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{pr.repo}</span>
                    <span className="text-xs text-muted-foreground">#{pr.id}</span>
                    <Badge variant="outline" className={S.cls}>{S.label}</Badge>
                  </div>
                  <div className="mt-1 truncate text-sm font-medium">{pr.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{pr.branch}</span>
                    <span>•</span>
                    <span className="text-emerald-400">+{pr.additions}</span>
                    <span className="text-red-400">-{pr.deletions}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{pr.comments}</span>
                    <span>•</span>
                    <span>{pr.time}</span>
                  </div>
                </div>
                <div className="hidden items-center gap-4 md:flex">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">AI score</div>
                    <div className={`font-display text-lg font-bold ${pr.score >= 90 ? "text-emerald-400" : pr.score >= 75 ? "text-amber-400" : "text-red-400"}`}>{pr.score}</div>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-primary-foreground">{pr.author}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
