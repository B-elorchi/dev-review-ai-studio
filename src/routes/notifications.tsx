import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Bot, CheckCircle2, GitPullRequest, MessageSquare, Rocket, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — DevReview AI" }] }),
  component: NotificationsPage,
});

const items = [
  { id: 1, icon: ShieldAlert, color: "text-red-400 bg-red-500/10", title: "Critical issue in PR #142", desc: "SQL injection vector found in auth/login.ts", time: "2m ago", unread: true },
  { id: 2, icon: GitPullRequest, color: "text-blue-400 bg-blue-500/10", title: "PR #141 reviewed by Code Reviewer", desc: "5 suggestions, 1 warning — ready to merge", time: "18m ago", unread: true },
  { id: 3, icon: Rocket, color: "text-purple-400 bg-purple-500/10", title: "DevOps pipeline generated", desc: "Dockerfile + GitHub Actions for acme/api", time: "1h ago", unread: false },
  { id: 4, icon: Bot, color: "text-emerald-400 bg-emerald-500/10", title: "Architect Agent completed analysis", desc: "Refactor recommendations available", time: "3h ago", unread: false },
  { id: 5, icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10", title: "Weekly quality report ready", desc: "Quality score improved by 7% this week", time: "Yesterday", unread: false },
  { id: 6, icon: MessageSquare, color: "text-sky-400 bg-sky-500/10", title: "Marcus commented on review #88", desc: "“Good catch — fixed in next commit”", time: "Yesterday", unread: false },
  { id: 7, icon: AlertTriangle, color: "text-amber-400 bg-amber-500/10", title: "Build failing on main", desc: "acme/web — tests failed (12/483)", time: "2 days ago", unread: false },
];

function NotificationsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="All activity from your projects, agents, and integrations."
        actions={<Button variant="outline">Mark all as read</Button>}
      />

      <div className="p-6">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2">7</Badge></TabsTrigger>
            <TabsTrigger value="unread">Unread <Badge variant="secondary" className="ml-2">2</Badge></TabsTrigger>
            <TabsTrigger value="mentions">Mentions</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-2">
            {items.map((n) => (
              <Card key={n.id} className={`glass flex items-start gap-3 p-4 transition hover:border-primary/30 ${n.unread ? "border-l-2 border-l-primary" : ""}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${n.color}`}>
                  <n.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{n.title}</div>
                    <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{n.desc}</div>
                </div>
                {n.unread && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="unread" className="mt-4 space-y-2">
            {items.filter((i) => i.unread).map((n) => (
              <Card key={n.id} className="glass flex items-start gap-3 border-l-2 border-l-primary p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${n.color}`}><n.icon className="h-4 w-4" /></div>
                <div className="flex-1"><div className="text-sm font-medium">{n.title}</div><div className="text-xs text-muted-foreground">{n.desc}</div></div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="mentions" className="mt-4">
            <Card className="glass flex flex-col items-center justify-center p-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-display text-base font-semibold">No mentions yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">When someone @mentions you, it'll show up here.</p>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="mt-4">
            <Card className="glass divide-y divide-border/60 p-0">
              {[
                { label: "PR reviews completed", desc: "When an AI review finishes on your PR", on: true },
                { label: "Critical issues", desc: "High severity findings in your code", on: true },
                { label: "Agent completions", desc: "When an AI agent finishes a task", on: true },
                { label: "Build & deploy", desc: "CI/CD failures and successes", on: false },
                { label: "Weekly digest", desc: "Summary of quality and activity", on: true },
                { label: "Product updates", desc: "New features and announcements", on: false },
              ].map((p) => (
                <div key={p.label} className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.desc}</div>
                  </div>
                  <Switch defaultChecked={p.on} />
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
