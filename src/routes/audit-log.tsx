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

const events = [
  { time: "2026-06-03 14:22:11", actor: "jane@acme.dev", action: "api_key.created", target: "drv_live_8aF2…", ip: "203.0.113.42", level: "info" },
  { time: "2026-06-03 13:51:04", actor: "marcus@acme.dev", action: "member.role_changed", target: "aisha@acme.dev → Admin", ip: "198.51.100.7", level: "warn" },
  { time: "2026-06-03 12:08:55", actor: "system", action: "review.completed", target: "acme/web#142", ip: "—", level: "info" },
  { time: "2026-06-03 11:47:32", actor: "jane@acme.dev", action: "integration.connected", target: "GitHub (acme org)", ip: "203.0.113.42", level: "info" },
  { time: "2026-06-03 09:12:09", actor: "sam@acme.dev", action: "auth.login", target: "web", ip: "192.0.2.18", level: "info" },
  { time: "2026-06-02 22:34:17", actor: "system", action: "billing.invoice_paid", target: "INV-2026-006 — $29.00", ip: "—", level: "info" },
  { time: "2026-06-02 18:01:42", actor: "marcus@acme.dev", action: "auth.failed_login", target: "web", ip: "45.33.12.9", level: "error" },
  { time: "2026-06-02 16:55:03", actor: "jane@acme.dev", action: "settings.updated", target: "Notifications", ip: "203.0.113.42", level: "info" },
];

const levelCls: Record<string, string> = {
  info: "border-border bg-muted/30 text-muted-foreground",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
};

function AuditPage() {
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
              {events.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{e.time}</TableCell>
                  <TableCell className="text-sm">{e.actor}</TableCell>
                  <TableCell><code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]">{e.action}</code></TableCell>
                  <TableCell className="text-sm">{e.target}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{e.ip}</TableCell>
                  <TableCell><Badge variant="outline" className={levelCls[e.level]}>{e.level}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
