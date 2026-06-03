import { createFileRoute } from "@tanstack/react-router";
import { AlertOctagon, AlertTriangle, Info, Lightbulb, Upload, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { CodeEditor } from "@/components/code-editor";
import { findings, sampleFiles } from "@/lib/mock-data";

export const Route = createFileRoute("/code-review")({
  head: () => ({ meta: [{ title: "Code Review — DevReview AI" }] }),
  component: CodeReview,
});

const sevConfig = {
  critical: { label: "Critical", className: "bg-rose-500/15 text-rose-400 border-rose-500/40", icon: AlertOctagon },
  high: { label: "High", className: "bg-orange-500/15 text-orange-400 border-orange-500/40", icon: AlertTriangle },
  medium: { label: "Medium", className: "bg-amber-500/15 text-amber-400 border-amber-500/40", icon: Info },
  low: { label: "Low", className: "bg-sky-500/15 text-sky-400 border-sky-500/40", icon: Lightbulb },
} as const;

function CodeReview() {
  const score = 87;
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div>
      <PageHeader
        eyebrow="AI Review"
        title="Code Review"
        description="Static analysis, security scans, and AI-powered recommendations."
        actions={
          <>
            <Button variant="outline" size="sm"><Upload className="mr-1.5 h-4 w-4" />Upload file</Button>
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Play className="mr-1.5 h-4 w-4" />Run review</Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        {/* code preview */}
        <Card className="glass overflow-hidden lg:col-span-2 p-0">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-xs">
            <span className="font-mono text-muted-foreground">src/controllers/user.ts</span>
            <Badge variant="outline" className="text-[10px]">TypeScript</Badge>
          </div>
          <div className="h-[420px]">
            <CodeEditor language="typescript" value={`import { Request, Response } from 'express';
import { db } from '../db';

// ⚠️ SQL injection vulnerability flagged here
export async function getUserById(req: Request, res: Response) {
  const userId = req.params.id;
  const result = await db.raw(
    \`SELECT * FROM users WHERE id = \${userId}\`
  );
  return res.json(result.rows[0]);
}

export async function listUsers(_req: Request, res: Response) {
  const users = await db.query('SELECT id, email, created_at FROM users');
  res.json(users);
}
`} readOnly />
          </div>
        </Card>

        {/* score */}
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
              <span className="font-display text-4xl font-bold gradient-text">{score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 text-center text-xs">
            <div><div className="font-display text-lg font-bold text-rose-400">1</div><div className="text-muted-foreground">Critical</div></div>
            <div><div className="font-display text-lg font-bold text-orange-400">1</div><div className="text-muted-foreground">High</div></div>
            <div><div className="font-display text-lg font-bold text-amber-400">1</div><div className="text-muted-foreground">Medium</div></div>
          </div>
        </Card>

        {/* findings */}
        <div className="space-y-3 lg:col-span-3">
          <h3 className="font-display text-lg font-semibold">Findings</h3>
          {findings.map((f, i) => {
            const c = sevConfig[f.severity];
            const Icon = c.icon;
            return (
              <Card key={i} className="glass overflow-hidden p-0">
                <div className="flex items-start gap-4 p-5">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${c.className}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={c.className}>{c.label}</Badge>
                      <h4 className="font-semibold">{f.title}</h4>
                      <span className="ml-auto font-mono text-xs text-muted-foreground">{f.file}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
                    <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">Recommendation</span>
                      <p className="mt-1 text-muted-foreground">{f.recommendation}</p>
                    </div>
                    <pre className="mt-2 overflow-auto rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 font-mono text-xs text-emerald-300"><code>{f.fix}</code></pre>
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
