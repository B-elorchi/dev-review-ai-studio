import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, MoreVertical, Plus, Shield, ShieldCheck, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team — DevReview AI" }] }),
  component: TeamPage,
});

function TeamPage() {
  const { workspaceId } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetchApi(`/workspaces/${workspaceId}/members`, {}, workspaceId);
      setMembers(res?.members ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, [workspaceId]);

  const invite = async () => {
    if (!inviteEmail || !workspaceId) return;
    setInviting(true);
    try {
      await fetchApi(`/workspaces/${workspaceId}/members/invite`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      }, workspaceId);
      toast.success("Invite sent");
      setInviteEmail("");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (userId: string, role: string) => {
    if (!workspaceId) return;
    try {
      await fetchApi(`/workspaces/${workspaceId}/members/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }, workspaceId);
      toast.success("Role updated");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update role");
    }
  };

  const removeMember = async (userId: string) => {
    if (!workspaceId) return;
    try {
      await fetchApi(`/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" }, workspaceId);
      toast.success("Member removed");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove");
    }
  };

  const admins = members.filter((m) => ["admin", "owner"].includes(m.role)).length;

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Team members"
        description="Invite teammates and manage their roles."
        actions={null}
      />

      <div className="grid gap-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total seats", value: `${members.length}`, icon: User },
            { label: "Admins", value: `${admins}`, icon: Shield },
            { label: "Members", value: `${members.length - admins}`, icon: Mail },
          ].map((s) => (
            <Card key={s.label} className="glass flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="font-display text-xl font-bold">{s.value}</div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="glass p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Invite by email</h3>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="teammate@company.com"
              className="flex-1"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className="rounded-md border border-border bg-background px-3 text-sm"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="reviewer">Reviewer</option>
            </select>
            <Button onClick={invite} disabled={inviting}>
              <Plus className="mr-1.5 h-4 w-4" />{inviting ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </Card>

        <Card className="glass p-0">
          <div className="border-b border-border/60 p-5">
            <h3 className="font-display text-base font-semibold">Members</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const profile = m.profiles ?? {};
                const name = profile.full_name ?? profile.email ?? m.user_id;
                const initials = name.slice(0, 2).toUpperCase();
                return (
                  <TableRow key={m.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={name} />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-primary-foreground">{initials}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{name}</div>
                          <div className="text-xs text-muted-foreground">{profile.email ?? ""}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={m.role === "owner" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : m.role === "admin" ? "border-primary/30 bg-primary/10 text-primary" : ""}>
                        {["owner", "admin"].includes(m.role) ? <ShieldCheck className="mr-1 h-3 w-3" /> : null}
                        {m.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => changeRole(m.user_id, "admin")}>Make admin</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changeRole(m.user_id, "member")}>Make member</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => removeMember(m.user_id)}>Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No members found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
