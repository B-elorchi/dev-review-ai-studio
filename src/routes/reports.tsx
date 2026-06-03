import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — DevReview AI" }] }),
  component: Reports,
});

const reviewTrend = Array.from({ length: 12 }).map((_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  reviews: 40 + Math.round(Math.sin(i) * 20) + i * 8,
  prs: 20 + Math.round(Math.cos(i) * 10) + i * 5,
}));
const security = [{ name: "Critical", value: 4, color: "var(--color-destructive)" }, { name: "High", value: 12, color: "#fb923c" }, { name: "Medium", value: 28, color: "#fbbf24" }, { name: "Low", value: 54, color: "var(--color-info)" }];
const quality = [
  { name: "auth-service", score: 92 }, { name: "payments", score: 87 }, { name: "user-svc", score: 64 },
  { name: "web", score: 88 }, { name: "data", score: 76 }, { name: "mobile", score: 81 },
];
const agentUsage = [
  { agent: "Reviewer", runs: 480 }, { agent: "DevOps", runs: 240 }, { agent: "Architect", runs: 120 }, { agent: "Docs", runs: 180 },
];

const tooltip = { background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 };

function Reports() {
  return (
    <div>
      <PageHeader eyebrow="Analytics" title="Reports" description="Org-wide insights across reviews, security, quality, and agent usage." />
      <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2">
        <Card className="glass p-5">
          <h3 className="mb-3 font-display font-semibold">Review Trends</h3>
          <div className="h-64">
            <ResponsiveContainer><AreaChart data={reviewTrend}>
              <defs>
                <linearGradient id="ra" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.6}/><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0}/></linearGradient>
                <linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.6}/><stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltip} />
              <Area type="monotone" dataKey="reviews" stroke="var(--color-primary)" fill="url(#ra)" strokeWidth={2} />
              <Area type="monotone" dataKey="prs" stroke="var(--color-accent)" fill="url(#rb)" strokeWidth={2} />
            </AreaChart></ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass p-5">
          <h3 className="mb-3 font-display font-semibold">Security Issues</h3>
          <div className="h-64">
            <ResponsiveContainer><PieChart>
              <Pie data={security} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                {security.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Legend />
              <Tooltip contentStyle={tooltip} />
            </PieChart></ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass p-5">
          <h3 className="mb-3 font-display font-semibold">Project Quality</h3>
          <div className="h-64">
            <ResponsiveContainer><BarChart data={quality}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="score" radius={[6,6,0,0]}>
                {quality.map((q) => <Cell key={q.name} fill={q.score >= 85 ? "var(--color-success)" : q.score >= 70 ? "#fbbf24" : "var(--color-destructive)"} />)}
              </Bar>
            </BarChart></ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass p-5">
          <h3 className="mb-3 font-display font-semibold">Agent Usage</h3>
          <div className="h-64">
            <ResponsiveContainer><BarChart data={agentUsage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis dataKey="agent" type="category" fontSize={11} stroke="var(--color-muted-foreground)" width={80} />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="runs" fill="var(--color-primary)" radius={[0,6,6,0]} />
            </BarChart></ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
