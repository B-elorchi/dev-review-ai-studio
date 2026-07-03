import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Box, ChevronRight, Database, Globe, Server, Smartphone, Cpu, Cloud } from "lucide-react";
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

const stackIconMap: Record<string, any> = {
  nextjs: Globe, fastapi: Server, "react-native": Smartphone,
  go: Cpu, postgres: Database, aws: Cloud, rust: Box, monorepo: Box,
};

const STACKS = ["All", "Frontend", "Backend", "Mobile", "Infra", "AI"];

function TemplatesPage() {
  const { workspaceId } = useAuthStore();
  const [templates, setTemplates] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [stack, setStack] = useState("All");
  const [using, setUsing] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (stack !== "All") params.set("stack", stack.toLowerCase());
    fetchApi(`/templates?${params}`)
      .then((r) => setTemplates(r?.data ?? []))
      .catch(console.error);
  }, [query, stack]);

  const useTemplate = async (slug: string) => {
    if (!workspaceId) { toast.error("No workspace selected"); return; }
    setUsing(slug);
    try {
      await fetchApi(`/templates/${slug}/use`, { method: "POST" }, workspaceId);
      toast.success("Project created from template");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to use template");
    } finally {
      setUsing(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Templates"
        title="Project templates"
        description="Production-ready starters with AI review, CI/CD, and infra pre-configured."
      />

      <div className="grid gap-6 p-6">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search templates…"
            className="max-w-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {STACKS.map((t) => (
            <Button key={t} variant={t === stack ? "secondary" : "outline"} size="sm" onClick={() => setStack(t)}>{t}</Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((t) => {
            const Icon = stackIconMap[t.slug] ?? Box;
            return (
              <Card key={t.slug} className="glass group cursor-pointer overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_0_30px_-10px_var(--primary)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 text-primary shadow-lg">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold">{t.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description ?? ""}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(t.tags ?? []).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="text-muted-foreground">{(t.usage_count ?? 0).toLocaleString()} uses</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-0.5 px-2 text-xs text-primary opacity-0 transition group-hover:opacity-100"
                    disabled={using === t.slug}
                    onClick={() => useTemplate(t.slug)}
                  >
                    {using === t.slug ? "Creating…" : <><span>Use template</span><ChevronRight className="h-3 w-3" /></>}
                  </Button>
                </div>
              </Card>
            );
          })}
          {templates.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground">No templates found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
