import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, MoreHorizontal, Code2, Clock, Workflow, Trash2, ScanSearch, FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { projects } from "@/lib/mock-data";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — DevReview AI" }] }),
  component: ProjectsPage,
});

function scoreColor(s: number) {
  if (s >= 85) return "text-emerald-400";
  if (s >= 70) return "text-amber-400";
  return "text-rose-400";
}

function ProjectsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="All repositories analyzed by DevReview AI."
        actions={
          <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
            <Plus className="mr-1.5 h-4 w-4" /> Create project
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <Card key={p.id} className="glass group relative overflow-hidden p-5 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_-10px_var(--primary)]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.language}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link to="/projects/$id" params={{ id: p.id }}><FolderOpen className="mr-2 h-3.5 w-3.5" />Open</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/code-review"><ScanSearch className="mr-2 h-3.5 w-3.5" />Review</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/devops"><Workflow className="mr-2 h-3.5 w-3.5" />Generate DevOps</Link></DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>

            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.lastAnalysis}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Score</span>
                <span className={`font-display text-lg font-bold ${scoreColor(p.score)}`}>{p.score}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <Link to="/projects/$id" params={{ id: p.id }}>Open</Link>
              </Button>
              <Button size="sm" className="flex-1 bg-primary/15 text-primary hover:bg-primary/25" asChild>
                <Link to="/code-review">Review</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
