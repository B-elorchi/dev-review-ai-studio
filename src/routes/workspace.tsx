import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings, Save, Trash2, ShieldAlert, Building, FolderGit2, Users, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/workspace")({
  head: () => ({ meta: [{ title: "Workspace Settings — DevReview AI" }] }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const { workspaceId } = useAuthStore();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<any>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState("member");
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  const load = async () => {
    if (!workspaceId) return;
    try {
      const [currentRes, listRes] = await Promise.all([
        fetchApi(`/workspaces/${workspaceId}`, {}, workspaceId),
        fetchApi("/workspaces")
      ]);
      
      if (currentRes?.workspace) {
        setWorkspace(currentRes.workspace);
        setName(currentRes.workspace.name || "");
        setSlug(currentRes.workspace.slug || "");
        
        if (currentRes.workspace.workspace_members && currentRes.workspace.workspace_members.length > 0) {
          setRole(currentRes.workspace.workspace_members[0].role);
        }
      }
      
      if (listRes?.workspaces) {
        setWorkspaces(listRes.workspaces);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, [workspaceId]);

  const handleSave = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await fetchApi(`/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ name, slug }),
      }, workspaceId);
      toast.success("Workspace settings updated");
      load();
      
      window.dispatchEvent(new Event("workspace-updated"));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update workspace");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workspaceId) return;
    setDeleting(true);
    try {
      await fetchApi(`/workspaces/${workspaceId}`, {
        method: "DELETE",
      }, workspaceId);
      
      toast.success("Workspace deleted");
      
      localStorage.removeItem("workspaceId");
      useAuthStore.setState({ workspaceId: null });
      navigate({ to: "/" });
      
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete workspace");
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectWorkspace = (id: string) => {
    localStorage.setItem("workspaceId", id);
    useAuthStore.setState({ workspaceId: id });
    window.location.reload();
  };

  const isOwner = role === "owner";
  const isAdmin = isOwner || role === "admin";

  if (!workspace) {
    return (
      <div>
        <PageHeader eyebrow="Settings" title="Workspace" description="Manage your current workspace settings." actions={null} />
        <div className="p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Workspace"
        description="Manage your current workspace settings."
        actions={null}
      />

      <div className="p-6 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Workspace List */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass p-6 border-primary/10 bg-gradient-to-b from-background/80 to-background/40 relative overflow-hidden group shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">Your Workspaces</h3>
                </div>
                
                <div className="space-y-3">
                  {workspaces.map(ws => {
                    const isActive = ws.id === workspaceId;
                    return (
                      <div 
                        key={ws.id} 
                        className={`group/item flex flex-col rounded-xl border p-4 transition-all duration-300 hover:shadow-md ${
                          isActive 
                            ? "bg-primary/5 border-primary/30 shadow-[0_0_15px_-3px_var(--primary)]" 
                            : "bg-muted/30 border-border hover:bg-muted/50 hover:border-primary/20"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground tracking-tight">{ws.name}</span>
                            <span className="text-xs text-muted-foreground mt-0.5 font-mono opacity-80">/{ws.slug}</span>
                            
                            <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground font-medium bg-background/50 py-1 px-2 rounded-md border border-border/50 w-fit">
                              <div className="flex items-center gap-1" title={`${ws.projects_count} Project${ws.projects_count !== 1 ? 's' : ''}`}>
                                <FolderGit2 className="h-3 w-3" /> {ws.projects_count}
                              </div>
                              <div className="flex items-center gap-1" title={`${ws.users_count} Member${ws.users_count !== 1 ? 's' : ''}`}>
                                <Users className="h-3 w-3" /> {ws.users_count}
                              </div>
                              <div className="flex items-center gap-1" title={`${ws.tokens_used} Tokens Used`}>
                                <Zap className="h-3 w-3 text-amber-500" /> {ws.tokens_used}
                              </div>
                            </div>
                          </div>
                          {ws.plan === "pro" ? (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/30 shadow-sm">Pro</Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] opacity-70">Free</Badge>
                          )}
                        </div>
                        
                        <div className="mt-auto pt-2 flex items-center justify-between">
                          {isActive ? (
                            <Badge variant="default" className="bg-primary/80 hover:bg-primary text-[10px] uppercase tracking-wider">Active</Badge>
                          ) : (
                            <div className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-200">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Switch to</span>
                            </div>
                          )}
                          
                          <Button 
                            variant={isActive ? "ghost" : "outline"} 
                            size="sm" 
                            className={`h-7 px-3 text-xs rounded-full transition-all duration-300 ${isActive ? "opacity-50 cursor-default" : "hover:bg-primary hover:text-primary-foreground group-hover/item:border-primary/50 group-hover/item:shadow-sm"}`}
                            disabled={isActive}
                            onClick={() => handleSelectWorkspace(ws.id)}
                          >
                            {isActive ? "Current" : "Switch"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Settings */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="glass p-6 border-white/5 relative overflow-hidden group shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-8">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">General Settings</h3>
                    <p className="text-xs text-muted-foreground mt-1">Manage configuration for your current active workspace.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 mb-8 p-4 rounded-xl bg-background/40 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <FolderGit2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-display leading-none">{workspace.projects_count || 0}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Projects</div>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-border/50"></div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-display leading-none">{workspace.users_count || 0}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Members</div>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-border/50"></div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-display leading-none">{workspace.tokens_used || 0}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Tokens Used</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 mb-8">
                  <div className="space-y-2">
                    <Label htmlFor="workspace-name" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Workspace Name</Label>
                    <Input 
                      id="workspace-name" 
                      className="h-11 bg-background/50 border-border/80 focus:bg-background transition-colors" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workspace-slug" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">URL Slug</Label>
                    <Input 
                      id="workspace-slug" 
                      className="h-11 font-mono text-sm bg-background/50 border-border/80 focus:bg-background transition-colors" 
                      value={slug} 
                      onChange={(e) => setSlug(e.target.value)} 
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                
                {isAdmin && (
                  <div className="flex justify-end pt-4 border-t border-border/40 mt-4">
                    <Button 
                      onClick={handleSave} 
                      disabled={saving || !name || !slug || (name === workspace.name && slug === workspace.slug)}
                      className="bg-gradient-to-r from-primary to-accent text-primary-foreground h-10 px-6 rounded-full shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {isOwner && (
              <Card className="glass p-6 border-destructive/20 bg-destructive/5 relative overflow-hidden shadow-lg group">
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4 text-destructive">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <h3 className="font-display text-lg font-semibold">Danger Zone</h3>
                  </div>
                  <p className="text-sm text-destructive/80 mb-6 leading-relaxed max-w-2xl">
                    Permanently delete this workspace and all of its projects, members, and settings. This action is destructive and <strong className="font-semibold text-destructive">cannot be undone</strong>.
                  </p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 h-10 px-6">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete workspace
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-destructive/20 bg-background/95 backdrop-blur-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                          <ShieldAlert className="h-5 w-5" /> Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm leading-relaxed mt-2">
                          This action cannot be undone. This will permanently delete the 
                          <strong className="text-foreground font-semibold px-1 py-0.5 mx-1 rounded bg-muted/50 border"> {workspace.name} </strong> 
                          workspace and remove all associated data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-6 border-t border-border/40 pt-4">
                        <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full">
                          {deleting ? "Deleting..." : "Yes, delete workspace"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
