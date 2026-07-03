import { Link, useRouter } from "@tanstack/react-router";
import { Search, Bell, ChevronDown, Command, Check, Plus, Loader2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api/client";
import { toast } from "sonner";

export function TopNav() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useRouter().navigate;

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Create Workspace state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadWs() {
    try {
      const res = await fetchApi("/workspaces");
      if (res?.workspaces) setWorkspaces(res.workspaces);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (user) loadWs();
  }, [user]);

  const activeWs = workspaces.find((w) => w.id === workspaceId) || workspaces[0];

  const firstName = profile?.full_name?.split(" ")[0] || profile?.name?.split(" ")[0] || user?.email?.split("@")[0] || "User";
  const fullName = profile?.full_name || profile?.name || user?.email?.split("@")[0] || "User";
  const initials = firstName.substring(0, 2).toUpperCase();

  const handleSelectWorkspace = (id: string) => {
    localStorage.setItem("workspaceId", id);
    useAuthStore.setState({ workspaceId: id });
    window.location.reload();
  };

  const handleCreateWorkspace = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      const res = await fetchApi("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: newName, slug: slug || `ws-${Date.now()}` }),
      });
      if (res.workspace) {
        toast.success("Workspace created");
        setCreateOpen(false);
        setNewName("");
        await loadWs();
        handleSelectWorkspace(res.workspace.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate({ to: "/projects", search: { q: searchQuery.trim() } as any });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 px-2.5 text-sm max-w-[200px]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gradient-to-br from-primary to-accent text-[10px] font-bold text-primary-foreground">
                {activeWs?.name ? activeWs.name.substring(0, 1).toUpperCase() : "W"}
              </span>
              <span className="font-medium truncate">{activeWs?.name || "Select Workspace"}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.map(ws => (
              <DropdownMenuItem key={ws.id} onClick={() => handleSelectWorkspace(ws.id)} className="flex items-center justify-between cursor-pointer">
                <span className="truncate">{ws.name}</span>
                <div className="flex items-center gap-2">
                  {ws.plan === "pro" && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Pro</Badge>}
                  {ws.id === workspaceId && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCreateOpen(true)} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" /> Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative ml-2 hidden flex-1 max-w-md md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search projects, files, agents…"
            className="h-9 w-full rounded-md border border-border bg-muted/30 pl-9 pr-16 text-sm outline-none ring-ring placeholder:text-muted-foreground focus:bg-muted/60 focus:ring-2"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground sm:flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="border-accent text-accent hover:bg-accent/10">
            <Link to="/pricing">Upgrade</Link>
          </Button>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/50">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">{fullName}</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/settings">Profile</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/billing">Billing</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => signOut()}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input
                id="ws-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Acme Corp"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateWorkspace(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-accent"
              onClick={handleCreateWorkspace}
              disabled={creating || !newName.trim()}
            >
              {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
