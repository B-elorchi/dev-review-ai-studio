import { createFileRoute } from "@tanstack/react-router";
import { Box, ChevronRight, Database, Globe, Server, Smartphone, Cpu, Cloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Templates — DevReview AI" }] }),
  component: TemplatesPage,
});

const templates = [
  { name: "Next.js + Supabase Starter", desc: "Full-stack TypeScript app with auth, database, and edge functions.", icon: Globe, gradient: "from-blue-500 to-cyan-500", tags: ["Next.js", "TS", "Supabase"], uses: 12482 },
  { name: "FastAPI Microservice", desc: "Production Python service with Docker, Postgres, and CI.", icon: Server, gradient: "from-emerald-500 to-teal-500", tags: ["Python", "FastAPI", "Docker"], uses: 8921 },
  { name: "React Native + Expo", desc: "Cross-platform mobile app with EAS build pipeline.", icon: Smartphone, gradient: "from-purple-500 to-pink-500", tags: ["RN", "Expo", "TS"], uses: 5621 },
  { name: "Go gRPC Service", desc: "High-performance Go service with protobufs and K8s manifests.", icon: Cpu, gradient: "from-sky-500 to-indigo-500", tags: ["Go", "gRPC", "K8s"], uses: 3402 },
  { name: "Postgres + Prisma Schema", desc: "Database-first schema with migrations and seed data.", icon: Database, gradient: "from-amber-500 to-orange-500", tags: ["Postgres", "Prisma"], uses: 7180 },
  { name: "AWS Lambda + CDK", desc: "Serverless functions deployed with Infrastructure as Code.", icon: Cloud, gradient: "from-orange-500 to-red-500", tags: ["AWS", "CDK", "TS"], uses: 4290 },
  { name: "Rust Axum API", desc: "Memory-safe REST API with SQLx and structured logging.", icon: Box, gradient: "from-red-500 to-rose-500", tags: ["Rust", "Axum"], uses: 1840 },
  { name: "Monorepo with Turborepo", desc: "Multi-package workspace with shared tooling and CI.", icon: Box, gradient: "from-slate-500 to-zinc-600", tags: ["Turbo", "Bun"], uses: 6112 },
];

function TemplatesPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Templates"
        title="Project templates"
        description="Production-ready starters with AI review, CI/CD, and infra pre-configured."
      />

      <div className="grid gap-6 p-6">
        <div className="flex items-center gap-2">
          <Input placeholder="Search templates…" className="max-w-sm" />
          {["All", "Frontend", "Backend", "Mobile", "Infra", "AI"].map((t) => (
            <Button key={t} variant={t === "All" ? "secondary" : "outline"} size="sm">{t}</Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((t) => (
            <Card key={t.name} className="glass group cursor-pointer overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_0_30px_-10px_var(--primary)]">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${t.gradient} text-white shadow-lg`}>
                <t.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{t.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {t.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                <span className="text-muted-foreground">{t.uses.toLocaleString()} uses</span>
                <span className="flex items-center gap-0.5 font-medium text-primary opacity-0 transition group-hover:opacity-100">Use template <ChevronRight className="h-3 w-3" /></span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
