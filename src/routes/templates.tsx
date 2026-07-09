import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Box, ChevronRight, Database, Globe, Server, Smartphone, Cpu, Cloud,
  Bot, Layers, Container, Search, Loader2, Star, Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Templates — DevReview AI" }] }),
  component: TemplatesPage,
});

const STACK_ICONS: Record<string, any> = {
  "nextjs-saas": Globe, "react-vite": Globe, "t3-stack": Globe,
  "fastapi-postgres": Server, "express-api": Server, "nestjs-api": Server,
  "go-rest": Cpu, "django-drf": Server,
  "expo-react-native": Smartphone, "flutter-app": Smartphone,
  "terraform-aws": Cloud, "docker-compose": Container, "k8s-helm": Layers,
  "langchain-agent": Bot, "rag-pipeline": Bot, "nextjs-ai-chat": Bot,
};

const STACK_COLORS: Record<string, string> = {
  frontend: "from-blue-500 to-cyan-500",
  backend:  "from-emerald-500 to-teal-500",
  mobile:   "from-purple-500 to-pink-500",
  infra:    "from-orange-500 to-amber-500",
  ai:       "from-violet-500 to-indigo-500",
};

const FILTERS = ["All", "Frontend", "Backend", "Mobile", "Infra", "AI"];

function TemplatesPage() {
  const { workspaceId } = useAuthStore();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");
  const [filter,    setFilter]    = useState("All");
  const [using,     setUsing]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (filter !== "All") params.set("stack", filter.toLowerCase());
    fetchApi(`/templates?${params}`)
      .then((r) => setTemplates(r?.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query, filter]);

  const useTemplate = async (tpl: any) => {
    if (!workspaceId) { toast.error("No workspace selected"); return; }
    setUsing(tpl.slug);
    try {
      const res = await fetchApi(`/templates/${tpl.slug}/use`, { method: "POST" }, workspaceId);
      toast.success(`Project "${tpl.name}" created — AI is generating starter files…`, { duration: 5000 });
      // Navigate to the new project
      if (res?.project?.id) {
        navigate({ to: "/projects/$id", params: { id: res.project.id } });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to use template");
    } finally {
      setUsing(null);
    }
  };

  const featured = templates.filter((t) => t.usage_count >= 500);
  const rest      = templates.filter((t) => t.usage_count < 500);

  return (
    <div>
      <PageHeader
        eyebrow="Templates"
        title="Project templates"
        description="Production-ready starters with AI-generated code, CI/CD, and infra pre-configured."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates…"
                className="h-8 w-52 pl-8 text-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        }
      />

      <div className="space-y-8 p-6">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f}
              variant={f === filter ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="h-7 text-xs"
            >
              {f}
            </Button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && templates.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            No templates found for "{query}".
          </div>
        )}

        {/* Featured */}
        {!loading && featured.length > 0 && filter === "All" && !query && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              <h2 className="font-display font-semibold">Popular</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featured.map((t) => <TemplateCard key={t.slug} tpl={t} using={using} onUse={useTemplate} />)}
            </div>
          </section>
        )}

        {/* All / filtered */}
        {!loading && (filter !== "All" || query || rest.length > 0) && (
          <section>
            {filter === "All" && !query && rest.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <h2 className="font-display font-semibold">All templates</h2>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(filter !== "All" || query ? templates : rest).map((t) => (
                <TemplateCard key={t.slug} tpl={t} using={using} onUse={useTemplate} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ tpl, using, onUse }: { tpl: any; using: string | null; onUse: (t: any) => void }) {
  const Icon  = STACK_ICONS[tpl.slug]  ?? Box;
  const color = STACK_COLORS[tpl.stack] ?? "from-primary to-accent";
  const busy  = using === tpl.slug;

  return (
    <Card className="glass group relative flex flex-col overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_0_30px_-10px_var(--primary)]">
      {/* Stack badge */}
      <span className="absolute right-3 top-3 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
        {tpl.stack}
      </span>

      {/* Icon */}
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>

      <h3 className="mt-4 font-display text-base font-semibold leading-tight">{tpl.name}</h3>

      {tpl.description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {(tpl.tags ?? []).slice(0, 4).map((tag: string) => (
          <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3 mt-4 text-xs">
        <span className="text-muted-foreground">{(tpl.usage_count ?? 0).toLocaleString()} uses</span>
        <Button
          size="sm"
          className={`h-7 gap-0.5 px-2 text-xs bg-gradient-to-r ${color} text-white opacity-0 transition group-hover:opacity-100`}
          disabled={busy || using !== null}
          onClick={() => onUse(tpl)}
        >
          {busy
            ? <><Loader2 className="h-3 w-3 animate-spin" />Creating…</>
            : <><span>Use template</span><ChevronRight className="h-3 w-3" /></>
          }
        </Button>
      </div>
    </Card>
  );
}
