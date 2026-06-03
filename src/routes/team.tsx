import { createFileRoute } from "@tanstack/react-router";
import { Mail, MoreVertical, Plus, Shield, ShieldCheck, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team — DevReview AI" }] }),
  component: TeamPage,
});

const members = [
  { name: "Jane Developer", email: "jane@acme.dev", role: "Owner", avatar: "JD", active: "Just now", status: "active" },
  { name: "Marcus Kim", email: "marcus@acme.dev", role: "Admin", avatar: "MK", active: "2m ago", status: "active" },
  { name: "Aisha Rahman", email: "aisha@acme.dev", role: "Member", avatar: "AR", active: "1h ago", status: "active" },
  { name: "Sam Lee", email: "sam@acme.dev", role: "Member", avatar: "SL", active: "Yesterday", status: "active" },
  { name: "Priya Singh", email: "priya@acme.dev", role: "Member", avatar: "PS", active: "Invitation sent", status: "pending" },
];

function TeamPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Team members"
        description="Invite teammates and manage their roles."
        actions={<Button className="bg-gradient-to-r from-primary to-accent"><Plus className="mr-1.5 h-4 w-4" />Invite member</Button>}
      />

      <div className="grid gap-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total seats", value: "5 / 10", icon: User },
            { label: "Admins", value: "2", icon: Shield },
            { label: "Pending invites", value: "1", icon: Mail },
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
            <Input placeholder="teammate@company.com" className="flex-1" />
            <select className="rounded-md border border-border bg-background px-3 text-sm">
              <option>Member</option><option>Admin</option>
            </select>
            <Button>Send invite</Button>
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
                <TableHead>Last active</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.email}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-primary-foreground">{m.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={m.role === "Owner" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : m.role === "Admin" ? "border-primary/30 bg-primary/10 text-primary" : ""}>
                      {m.role === "Owner" || m.role === "Admin" ? <ShieldCheck className="mr-1 h-3 w-3" /> : null}{m.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {m.status === "pending" ? <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">Pending</Badge> : <span className="text-muted-foreground">{m.active}</span>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Change role</DropdownMenuItem>
                        <DropdownMenuItem>Resend invite</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
