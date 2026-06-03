import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Eye, EyeOff, Key, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — DevReview AI" }] }),
  component: ApiKeysPage,
});

const keys = [
  { id: "1", name: "Production CI", prefix: "drv_live_8aF2", created: "Mar 12, 2026", lastUsed: "2 minutes ago", scope: "full" },
  { id: "2", name: "Staging", prefix: "drv_test_kL93", created: "Feb 28, 2026", lastUsed: "1 day ago", scope: "read" },
  { id: "3", name: "GitHub Action", prefix: "drv_live_qR1m", created: "Jan 14, 2026", lastUsed: "12 minutes ago", scope: "review" },
  { id: "4", name: "Local dev", prefix: "drv_test_zX7v", created: "Dec 02, 2025", lastUsed: "3 months ago", scope: "full" },
];

function ApiKeysPage() {
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  return (
    <div>
      <PageHeader
        eyebrow="Developers"
        title="API Keys"
        description="Authenticate requests to the DevReview AI REST and CLI APIs."
        actions={<Button className="bg-gradient-to-r from-primary to-accent"><Plus className="mr-1.5 h-4 w-4" />Create API key</Button>}
      />

      <div className="grid gap-6 p-6">
        <Card className="glass border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex gap-3">
            <Key className="mt-0.5 h-4 w-4 text-amber-400" />
            <div className="text-xs text-amber-200/90">
              <strong>Keep your keys secret.</strong> Treat them like passwords — never commit them to source control. Use environment variables or a secrets manager.
            </div>
          </div>
        </Card>

        <Card className="glass p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => {
                const shown = reveal[k.id];
                const display = shown ? `${k.prefix}_a92ksLQ4P8mZxR1` : `${k.prefix}${"•".repeat(16)}`;
                return (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted/50 px-2 py-1 font-mono text-xs">{display}</code>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setReveal({ ...reveal, [k.id]: !shown })}>
                          {shown ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(k.prefix); toast.success("Copied to clipboard"); }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={k.scope === "full" ? "border-primary/30 bg-primary/10 text-primary" : k.scope === "review" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : ""}>
                        {k.scope}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{k.created}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{k.lastUsed}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        <Card className="glass p-6">
          <h3 className="font-display text-base font-semibold">Quick start</h3>
          <p className="mt-1 text-sm text-muted-foreground">Send your first authenticated request:</p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-[#0a0a0f] p-4 font-mono text-xs leading-relaxed">
{`curl https://api.devreview.ai/v1/reviews \\
  -H "Authorization: Bearer drv_live_8aF2..." \\
  -H "Content-Type: application/json" \\
  -d '{ "repo": "acme/web", "pr": 142 }'`}
          </pre>
        </Card>
      </div>
    </div>
  );
}
