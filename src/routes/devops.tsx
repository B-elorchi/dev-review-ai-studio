import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronRight, Container, FileCode, Cloud, Boxes, Workflow, Download, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { CodeEditor } from "@/components/code-editor";
import { fetchApi } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/devops")({
  head: () => ({ meta: [{ title: "DevOps Generator — DevReview AI" }] }),
  component: DevOps,
});

// Generated mock object removed from here

const fileIcons = {
  Dockerfile: Container,
  "docker-compose.yml": Boxes,
  "github-actions.yml": Workflow,
  "k8s-deployment.yaml": Cloud,
  "k8s-service.yaml": Cloud,
};

function DevOps() {
  const [step, setStep] = useState(1);
  const [active, setActive] = useState<string>("Dockerfile");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<Record<string, { lang: string, content: string }>>({});

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/devops/generate", {
        method: "POST",
        body: JSON.stringify({ stack: "Node", targets: ["dockerfile", "github-actions"] })
      });
      if (res?.generated) {
        setGenerated(res.generated);
        setStep(2);
      }
    } catch (err: any) {
      toast.error("Failed to generate DevOps assets");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Wizard"
        title="DevOps Generator"
        description="Generate Dockerfiles, CI/CD pipelines and Kubernetes manifests in seconds."
      />
      <div className="space-y-6 p-6">
        {/* steps */}
        <div className="flex items-center gap-4">
          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold ${step >= n ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                {step > n ? <Check className="h-4 w-4" /> : n}
              </div>
              <span className={`text-sm ${step >= n ? "font-medium" : "text-muted-foreground"}`}>
                {n === 1 ? "Project information" : "Generate configuration"}
              </span>
              {n < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <Card className="glass p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: "Framework", placeholder: "Choose framework", options: ["Express", "FastAPI", "NestJS", "Spring Boot", "Gin"] },
                { label: "Language", placeholder: "Choose language", options: ["TypeScript", "Python", "Go", "Java", "Rust"] },
                { label: "Database", placeholder: "Choose database", options: ["PostgreSQL", "MySQL", "MongoDB", "Redis"] },
                { label: "Deployment Target", placeholder: "Choose target", options: ["Kubernetes", "Docker Swarm", "AWS ECS", "Fly.io", "Vercel"] },
              ].map((f) => (
                <div key={f.label} className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder={f.placeholder} /></SelectTrigger>
                    <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleGenerate} disabled={loading} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                <Sparkles className="mr-1.5 h-4 w-4" />{loading ? "Generating..." : "Generate"}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
            <Card className="glass p-2">
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Generated files</div>
              {Object.keys(generated).map((name) => {
                const Icon = fileIcons[name as keyof typeof fileIcons] ?? FileCode;
                return (
                  <button key={name} onClick={() => setActive(name)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/50 ${active === name ? "bg-primary/15 text-primary" : ""}`}>
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{name}</span>
                  </button>
                );
              })}
            </Card>
            <Card className="glass overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
                <span className="font-mono text-xs">{active}</span>
                <Button variant="ghost" size="sm"><Download className="mr-1.5 h-3.5 w-3.5" />Download</Button>
              </div>
              <div className="h-[520px]">
                {generated[active] && (
                  <CodeEditor value={generated[active].content} language={generated[active].lang} readOnly />
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
