import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Plus, MoreHorizontal, Code2, Clock, Workflow, Trash2, ScanSearch,
  FolderOpen, Pencil, Github, Search, Lock, Unlock, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — DevReview AI" }] }),
  component: ProjectsPage,
});

function scoreColor(s: number) {
  if (s >= 85) return "text-emerald-400";
  if (s >= 70) return "text-amber-400";
  return "text-rose-400";
}

type GhRepo = {
  id: string; name: string; language: string; stars: number;
  lastUpdated: string; private: boolean; url: string; clone_url: string;
};

const EMPTY_CREATE = { name: "", description: "", private: false };

function ProjectsPage() {
  const navigate = useNavigate();
  const { workspaceId } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"link" | "new">("link");

  // Link existing GitHub repo
  const [ghRepos, setGhRepos] = useState<GhRepo[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghSearch, setGhSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GhRepo | null>(null);

  // Create new GitHub repo
  const [newRepo, setNewRepo] = useState(EMPTY_CREATE);

  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!workspaceId) return;
    try {
      const data = await fetchApi("/projects", {}, workspaceId);
      setProjects(Array.isArray(data) ? data : data.projects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [workspaceId]);

  const openCreate = async () => {
    setCreateTab("link");
    setSelectedRepo(null);
    setGhSearch("");
    setNewRepo(EMPTY_CREATE);
    setCreateOpen(true);
    // Pre-fetch GitHub repos
    setGhLoading(true);
    try {
      const data = await fetchApi("/integrations/github/repos", {}, workspaceId ?? undefined);
      setGhRepos(data.repos ?? []);
    } catch {
      setGhRepos([]);
    } finally {
      setGhLoading(false);
    }
  };

  const filteredRepos = ghRepos.filter((r) =>
    r.name.toLowerCase().includes(ghSearch.toLowerCase())
  );

  const saveByLinking = async () => {
    if (!selectedRepo || !workspaceId) return;
    setSaving(true);
    try {
      await fetchApi("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: selectedRepo.name.split("/").pop(),
          repo_url: selectedRepo.url,
          description: `Linked from GitHub: ${selectedRepo.name}`,
        }),
      }, workspaceId);
      toast.success("Project linked from GitHub");
      setCreateOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to link project");
    } finally {
      setSaving(false);
    }
  };

  const saveByCreating = async () => {
    if (!newRepo.name.trim() || !workspaceId) return;
    setSaving(true);
    try {
      // 1. Create repo on GitHub
      const ghData = await fetchApi("/integrations/github/repos", {
        method: "POST",
        body: JSON.stringify(newRepo),
      }, workspaceId);
      const repo = ghData.repo;

      // 2. Create project in DevReview linked to the new repo
      await fetchApi("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newRepo.name,
          repo_url: repo.url,
          description: newRepo.description || undefined,
        }),
      }, workspaceId);
      toast.success(`Repository "${repo.name}" created on GitHub and added as project`);
      setCreateOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create repo");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (p: any) => {
    setEditTarget(p);
    setEditForm({ name: p.name ?? "", description: p.description ?? "" });
  };

  const saveEdit = async () => {
    if (!editTarget || !workspaceId) return;
    setEditSaving(true);
    try {
      await fetchApi(`/projects/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      }, workspaceId);
      toast.success("Project updated");
      setEditTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update");
    } finally {
      setEditSaving(false);
    }
  };

  const deleteProject = async () => {
    if (!deleteTarget || !workspaceId) return;
    setDeleting(true);
    try {
      await fetchApi(`/projects/${deleteTarget.id}`, { method: "DELETE" }, workspaceId);
      toast.success("Project deleted");
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="All repositories analyzed by DevReview AI."
        actions={
          <Button
            size="sm"
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
            onClick={openCreate}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add project
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <Card
            key={p.id}
            className="glass group relative overflow-hidden p-5 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_-10px_var(--primary)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.repo_url || "No repo URL"}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/projects/$id" params={{ id: p.id }}>
                      <FolderOpen className="mr-2 h-3.5 w-3.5" />Open
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(p)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/code-review", search: { projectId: p.id } })}>
                    <ScanSearch className="mr-2 h-3.5 w-3.5" />Review
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/devops">
                      <Workflow className="mr-2 h-3.5 w-3.5" />Generate DevOps
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(p)}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {p.description || "No description provided."}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Score</span>
                <span className={`font-display text-lg font-bold ${scoreColor(p.health_score ?? 0)}`}>
                  {p.health_score ?? "N/A"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <Link to="/projects/$id" params={{ id: p.id }}>Open</Link>
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-primary/15 text-primary hover:bg-primary/25"
                onClick={() => navigate({ to: "/code-review", search: { projectId: p.id } })}
              >
                Review
              </Button>
            </div>
          </Card>
        ))}

        {!loading && projects.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-20 text-center">
            <Code2 className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-muted-foreground">No projects yet. Add your first one.</p>
            <Button className="mt-4 bg-gradient-to-r from-primary to-accent" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />Add project
            </Button>
          </div>
        )}
      </div>

      {/* Create dialog — two modes */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              Add project from GitHub
            </DialogTitle>
          </DialogHeader>

          <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as "link" | "new")}>
            <TabsList className="w-full">
              <TabsTrigger value="link" className="flex-1">Link existing repo</TabsTrigger>
              <TabsTrigger value="new" className="flex-1">Create new repo</TabsTrigger>
            </TabsList>

            {/* Tab 1: link an existing GitHub repo */}
            <TabsContent value="link" className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search your repositories…"
                  value={ghSearch}
                  onChange={(e) => setGhSearch(e.target.value)}
                />
              </div>

              <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                {ghLoading && (
                  <div className="flex items-center justify-center p-8 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading repos…
                  </div>
                )}
                {!ghLoading && filteredRepos.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No repositories found.{!ghRepos.length && " Add GITHUB_TOKEN to your server .env to load repos."}
                  </div>
                )}
                {filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo.id === selectedRepo?.id ? null : repo)}
                    className={`flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left text-sm last:border-0 hover:bg-muted/40 ${
                      selectedRepo?.id === repo.id ? "bg-primary/10" : ""
                    }`}
                  >
                    {repo.private ? <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <Unlock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    <span className="flex-1 font-medium">{repo.name}</span>
                    <span className="text-xs text-muted-foreground">{repo.language}</span>
                  </button>
                ))}
              </div>

              {selectedRepo && (
                <p className="text-xs text-muted-foreground">
                  Selected: <span className="text-foreground font-medium">{selectedRepo.name}</span> — will be added as a DevReview project.
                </p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  className="bg-gradient-to-r from-primary to-accent"
                  disabled={!selectedRepo || saving}
                  onClick={saveByLinking}
                >
                  {saving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Linking…</> : "Link repo"}
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* Tab 2: create a brand-new GitHub repo */}
            <TabsContent value="new" className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-repo-name">Repository name *</Label>
                <Input
                  id="new-repo-name"
                  placeholder="my-new-service"
                  value={newRepo.name}
                  onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-repo-desc">Description</Label>
                <Input
                  id="new-repo-desc"
                  placeholder="What does this repo do?"
                  value={newRepo.description}
                  onChange={(e) => setNewRepo({ ...newRepo, description: e.target.value })}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newRepo.private}
                  onChange={(e) => setNewRepo({ ...newRepo, private: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Private repository
              </label>
              <p className="text-xs text-muted-foreground">
                A new repository will be created on GitHub and immediately added as a DevReview project. Requires <code className="text-xs">GITHUB_TOKEN</code> on the server.
              </p>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  className="bg-gradient-to-r from-primary to-accent"
                  disabled={!newRepo.name.trim() || saving}
                  onClick={saveByCreating}
                >
                  {saving
                    ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creating…</>
                    : <><Github className="mr-1.5 h-4 w-4" />Create on GitHub</>}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-primary to-accent"
              disabled={editSaving || !editForm.name.trim()}
              onClick={saveEdit}
            >
              {editSaving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its reviews and findings. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteProject}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
