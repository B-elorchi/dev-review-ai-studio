import { createFileRoute } from "@tanstack/react-router";
import { Check, CreditCard, Download, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing — DevReview AI" }] }),
  component: BillingPage,
});

const plans = [
  { name: "Free", price: 0, features: ["3 projects", "100 reviews/mo", "Community support"], current: false },
  { name: "Pro", price: 29, features: ["Unlimited projects", "5,000 reviews/mo", "GitHub & Telegram", "Priority support"], current: true, popular: true },
  { name: "Enterprise", price: 99, features: ["Everything in Pro", "SSO & SAML", "Audit logs", "Dedicated support", "Custom agents"], current: false },
];

const invoices = [
  { id: "INV-2026-006", date: "Jun 1, 2026", amount: "$29.00", status: "paid" },
  { id: "INV-2026-005", date: "May 1, 2026", amount: "$29.00", status: "paid" },
  { id: "INV-2026-004", date: "Apr 1, 2026", amount: "$29.00", status: "paid" },
  { id: "INV-2026-003", date: "Mar 1, 2026", amount: "$29.00", status: "paid" },
];

function BillingPage() {
  return (
    <div>
      <PageHeader eyebrow="Account" title="Billing & Plans" description="Manage your subscription, usage, and invoices." />

      <div className="grid gap-6 p-6">
        {/* Usage */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "AI Reviews", used: 1248, total: 5000, icon: Sparkles, color: "from-blue-500 to-cyan-500" },
            { label: "DevOps Generations", used: 87, total: 500, icon: Zap, color: "from-purple-500 to-pink-500" },
            { label: "Agent Runs", used: 342, total: 2000, icon: TrendingUp, color: "from-amber-500 to-orange-500" },
          ].map((u) => {
            const pct = (u.used / u.total) * 100;
            return (
              <Card key={u.label} className="glass p-5">
                <div className="flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${u.color}`}>
                    <u.icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-muted-foreground">{u.label}</div>
                  <div className="font-display text-2xl font-bold">{u.used.toLocaleString()}<span className="text-base font-normal text-muted-foreground"> / {u.total.toLocaleString()}</span></div>
                </div>
                <Progress value={pct} className="mt-3 h-1.5" />
              </Card>
            );
          })}
        </div>

        {/* Plans */}
        <div>
          <h2 className="mb-4 font-display text-lg font-semibold">Choose your plan</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <Card key={p.name} className={`glass relative p-6 ${p.popular ? "border-primary/60 shadow-[0_0_30px_-10px_var(--primary)]" : ""}`}>
                {p.popular && <Badge className="absolute -top-2 right-4 bg-gradient-to-r from-primary to-accent">Most popular</Badge>}
                <div className="font-display text-lg font-semibold">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold">${p.price}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{f}
                    </li>
                  ))}
                </ul>
                <Button className={`mt-6 w-full ${p.popular ? "bg-gradient-to-r from-primary to-accent" : ""}`} variant={p.current ? "outline" : p.popular ? "default" : "outline"} disabled={p.current}>
                  {p.current ? "Current plan" : p.price === 0 ? "Downgrade" : "Upgrade"}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Payment method */}
        <Card className="glass p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Payment method</h3>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-9 w-12 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white">VISA</div>
                <div className="text-sm">•••• 4242 <span className="text-muted-foreground">expires 09/27</span></div>
              </div>
            </div>
            <Button variant="outline"><CreditCard className="mr-1.5 h-4 w-4" />Update</Button>
          </div>
        </Card>

        {/* Invoices */}
        <Card className="glass p-0">
          <div className="border-b border-border/60 p-5">
            <h3 className="font-display text-base font-semibold">Invoices</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.id}</TableCell>
                  <TableCell className="text-sm">{inv.date}</TableCell>
                  <TableCell className="text-sm">{inv.amount}</TableCell>
                  <TableCell><Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">Paid</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8"><Download className="h-3.5 w-3.5" /></Button>
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
