import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderGit2, CheckCircle2, Rocket, Bot, ArrowUpRight, GitPullRequest, ShieldAlert, Container, Boxes, Sparkles, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api/client";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — DevReview AI" }] }),
  component: Dashboard,
});

const iconMap = { folder: FolderGit2, check: CheckCircle2, rocket: Rocket, bot: Bot } as const;
const activityIcon = { review: CheckCircle2, pr: GitPullRequest, docker: Container, k8s: Boxes, agent: Sparkles } as const;
const severityClass: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  info: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  destructive: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

import { useAuthStore } from "@/lib/auth-store";

function Dashboard() {
  const [data, setData] = useState<{ stats: any[], qualityTrend: any[], activity: any[] }>({ stats: [], qualityTrend: [], activity: [] });
  const [loading, setLoading] = useState(true);
  const workspaceId = useAuthStore((s) => s.workspaceId);

  useEffect(() => {
    async function load() {
      if (!workspaceId) return;
      try {
        const res = await fetchApi("/analytics/dashboard", {}, workspaceId);
        if (res) setData(res);
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
        eyebrow="Overview"
        title="Welcome back, Jane"
        description="Here's what's happening across your engineering organization today."
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link to="/reports">View reports</Link></Button>
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90" asChild>
              <Link to="/projects"><Sparkles className="mr-1.5 h-3.5 w-3.5" />New analysis</Link>
            </Button>
          </>
        }
      />

      <div className="space-y-6 p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.stats.map((s) => {
            const Icon = iconMap[s.icon as keyof typeof iconMap];
            return (
              <Card key={s.label} className="glass relative overflow-hidden p-5 transition-all hover:border-primary/40">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 font-display text-3xl font-bold tracking-tight">{s.value}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                    <TrendingUp className="h-3 w-3" />{s.delta}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Quality chart */}
          <Card className="glass lg:col-span-2 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Quality Metrics</h3>
                <p className="text-xs text-muted-foreground">7-day rolling average</p>
              </div>
              <div className="flex gap-1.5 text-xs">
                <Badge variant="outline" className="border-primary/40 text-primary">Quality 89</Badge>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">Security 91</Badge>
                <Badge variant="outline" className="border-amber-500/40 text-amber-400">Debt 22</Badge>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.qualityTrend}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="quality" stroke="var(--color-primary)" fill="url(#g1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="security" stroke="var(--color-success)" fill="url(#g2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Activity */}
          <Card className="glass p-5">
            <h3 className="font-display text-lg font-semibold">Recent Activity</h3>
            <p className="mb-4 text-xs text-muted-foreground">Latest actions across your workspace</p>
            <div className="space-y-3">
              {data.activity.map((a, i) => {
                const Icon = activityIcon[a.type as keyof typeof activityIcon] ?? ShieldAlert;
                return (
                  <div key={i} className="flex gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${severityClass[a.severity]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-tight">{a.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.time}</p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
