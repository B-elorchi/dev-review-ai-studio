import { createFileRoute } from "@tanstack/react-router";
import { Download, Search, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/audit-log")({
  head: () => ({ meta: [{ title: "Audit Log — DevReview AI" }] }),
  component: AuditPage,
});

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

const levelCls: Record<string, string> = {
  info: "border-border bg-muted/30 text-muted-foreground",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
};

function AuditPage() {
  const { workspaceId } = useAuthStore();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetchApi("/audit-log", {}, workspaceId)
      .then((d) => setEvents(d.events ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return (
    <div>
      <PageHeader
        eyebrow="Security"
        title="Audit log"
        description="Tamper-evident record of every action in your workspace."
        actions={<Button variant="outline"><Download className="mr-1.5 h-4 w-4" />Export CSV</Button>}
      />

      <div className="grid gap-4 p-6">
        <Card className="glass flex items-center gap-3 border-primary/30 bg-primary/5 p-4">
          <Shield className="h-4 w-4 text-primary" />
          <div className="text-xs">
            <strong>SOC 2 retention:</strong> events are stored for 7 years and signed hourly to prevent tampering.
          </div>
        </Card>

        <div className="flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by actor, action, target…" className="pl-9" />
          </div>
          <Button variant="outline" size="sm">Last 7 days</Button>
          <Button variant="outline" size="sm">All actors</Button>
          <Button variant="outline" size="sm">All actions</Button>
        </div>

        <Card className="glass p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              )}
              {events.map((e, i) => {
                const ts = e.created_at ? new Date(e.created_at).toLocaleString() : e.time;
                const lvl = e.level || "info";
                return (
                  <TableRow key={e.id || i}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{ts}</TableCell>
                    <TableCell className="text-sm">{e.actor_email || e.actor_id || e.actor}</TableCell>
                    <TableCell><code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]">{e.action}</code></TableCell>
                    <TableCell className="text-sm">{e.target}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{e.ip_address || e.ip || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={levelCls[lvl] || levelCls.info}>{lvl}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
