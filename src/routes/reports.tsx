import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — DevReview AI" }] }),
  component: Reports,
});

const SEV_COLORS: Record<string, string> = {
  critical: "var(--color-destructive)", high: "#fb923c", medium: "#fbbf24", low: "var(--color-info)",
};

const tooltip = { background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 };

function Reports() {
  const { workspaceId } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    fetchApi("/analytics/reports", {}, workspaceId)
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError(err.message || "Failed to load reports");
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const reviewTrend = (data?.reviewTrend ?? []).map((r: any) => ({ ...r, month: r.month?.slice(5) ?? r.month }));
  const security = (data?.security ?? []).map((s: any) => ({ name: s.severity, value: s.count, color: SEV_COLORS[s.severity] ?? "var(--color-primary)" }));
  const quality = data?.quality ?? [];
  const agentUsage = data?.agentUsage ?? [];

  return (
    <div>
      <PageHeader eyebrow="Analytics" title="Reports" description="Org-wide insights across reviews, security, quality, and agent usage." />
      {error && (
        <div className="px-6 pt-6">
          <Card className="glass border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </Card>
        </div>
      )}
      {loading && (
        <div className="px-6 pt-6">
          <Badge variant="outline" className="border-primary/40 text-primary">Loading reports...</Badge>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2">
        <Card className="glass p-5">
          <h3 className="mb-3 font-display font-semibold">Review Trends (12 months)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={reviewTrend}>
                <defs>
                  <linearGradient id="ra" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={tooltip} />
                <Area type="monotone" dataKey="reviews" stroke="var(--color-primary)" fill="url(#ra)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass p-5">
          <h3 className="mb-3 font-display font-semibold">Security Issues by Severity</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={security} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {security.map((s: any) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={tooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass p-5">
          <h3 className="mb-3 font-display font-semibold">Project Health Scores</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={quality}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="project" fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={tooltip} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {quality.map((q: any) => (
                    <Cell key={q.project} fill={q.score >= 85 ? "var(--color-success)" : q.score >= 70 ? "#fbbf24" : "var(--color-destructive)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass p-5">
          <h3 className="mb-3 font-display font-semibold">Agent Usage This Month</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={agentUsage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis dataKey="agent" type="category" fontSize={11} stroke="var(--color-muted-foreground)" width={90} />
                <Tooltip contentStyle={tooltip} />
                <Bar dataKey="runs" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
