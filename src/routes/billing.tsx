import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, CreditCard, Download, Sparkles, TrendingUp, Zap, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing — DevReview AI" }] }),
  component: BillingPage,
});

function BillingPage() {
  const { workspaceId } = useAuthStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  
  const [upgradePlan, setUpgradePlan] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<boolean>(false);

  useEffect(() => {
    fetchApi("/billing/plans").then((r) => setPlans(r?.plans ?? [])).catch(console.error);
    if (!workspaceId) return;
    Promise.all([
      fetchApi("/billing/invoices", {}, workspaceId),
      fetchApi("/billing/usage", {}, workspaceId),
      fetchApi("/billing/subscription", {}, workspaceId),
      fetchApi("/billing/payment-method", {}, workspaceId),
    ]).then(([inv, use, sub, pay]) => {
      setInvoices(inv?.invoices ?? []);
      setUsage(use?.usage ?? null);
      setSubscription(sub?.subscription ?? null);
      setPaymentMethod(pay?.method ?? null);
    }).catch(console.error);
  }, [workspaceId]);

  const stripeCheckout = async () => {
    if (!workspaceId || !upgradePlan) return;
    setUpgrading(true);
    try {
      const res = await fetchApi("/billing/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: upgradePlan }),
      }, workspaceId);
      if (res?.url) window.location.href = res.url;
    } catch (err: any) {
      toast.error(err.message ?? "Checkout failed");
    } finally {
      setUpgrading(false);
    }
  };

  const usageItems = [
    { label: "AI Reviews", key: "reviews", total: 1000, icon: Sparkles, color: "from-blue-500 to-cyan-500" },
    { label: "DevOps Generations", key: "devops_generations", total: 500, icon: Zap, color: "from-purple-500 to-pink-500" },
    { label: "Agent Runs", key: "agent_runs", total: 2000, icon: TrendingUp, color: "from-amber-500 to-orange-500" },
  ];

  const currentPlanId = subscription?.plan?.id ?? "free";

  return (
    <div>
      <PageHeader eyebrow="Account" title="Billing & Plans" description="Manage your subscription, usage, and invoices." />

      <div className="grid gap-6 p-6">
        {/* Usage */}
        <div className="grid gap-4 md:grid-cols-3">
          {usageItems.map((u) => {
            const used = usage?.[u.key] ?? 0;
            const pct = Math.min((used / u.total) * 100, 100);
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
                  <div className="font-display text-2xl font-bold">
                    {used.toLocaleString()}
                    <span className="text-base font-normal text-muted-foreground"> / {u.total.toLocaleString()}</span>
                  </div>
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
            {plans.map((p) => {
              const isCurrent = p.id === currentPlanId;
              const isPopular = p.id === "pro";
              return (
                <Card key={p.id} className={`glass relative p-6 ${isPopular ? "border-primary/60 shadow-[0_0_30px_-10px_var(--primary)]" : ""}`}>
                  {isPopular && <Badge className="absolute -top-2 right-4 bg-gradient-to-r from-primary to-accent">Most popular</Badge>}
                  <div className="font-display text-lg font-semibold">{p.name}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-display text-3xl font-bold">${p.price}</span>
                    <span className="text-sm text-muted-foreground">/{p.interval}</span>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {(p.features ?? []).map((f: string) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`mt-6 w-full ${isPopular && !isCurrent ? "bg-gradient-to-r from-primary to-accent" : ""}`}
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || p.price === 0}
                    onClick={() => !isCurrent && p.price > 0 && setUpgradePlan(p.id)}
                  >
                    {isCurrent ? "Current plan" : p.price === 0 ? "Downgrade" : "Upgrade"}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Payment method */}
        <Card className="glass p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Payment method</h3>
              <div className="mt-2 flex items-center gap-3">
                {paymentMethod ? (
                  <>
                    <div className="flex h-9 w-12 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white uppercase">
                      {paymentMethod.brand}
                    </div>
                    <div className="text-sm">
                      •••• {paymentMethod.last4} <span className="text-muted-foreground">expires {paymentMethod.exp_month}/{paymentMethod.exp_year}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No payment method saved.</div>
                )}
              </div>
            </div>
            <Button variant="outline" onClick={async () => {
              try {
                const res = await fetchApi("/billing/portal");
                if (res?.url) window.location.href = res.url;
              } catch (err: any) { toast.error(err.message); }
            }}>
              <CreditCard className="mr-1.5 h-4 w-4" />Manage
            </Button>
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
                  <TableCell className="font-mono text-xs">{inv.id?.slice(0, 8) ?? "—"}</TableCell>
                  <TableCell className="text-sm">{new Date(inv.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">${((inv.amount ?? 0) / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${inv.status === "paid" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {inv.pdf ? (
                      <a href={inv.pdf} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost" className="h-8 w-8"><Download className="h-3.5 w-3.5" /></Button>
                      </a>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-8 w-8" disabled><Download className="h-3.5 w-3.5" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No invoices yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={!!upgradePlan} onOpenChange={(o) => !o && setUpgradePlan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete your upgrade</DialogTitle>
            <DialogDescription>Choose your preferred payment method below.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Button className="w-full bg-gradient-to-r from-primary to-accent py-6 text-base" onClick={stripeCheckout} disabled={upgrading}>
              {upgrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
              Pay with Card
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
            </div>

            <PayPalScriptProvider options={{ clientId: "test", currency: "USD", intent: "capture" }}>
              <PayPalButtons
                style={{ layout: "vertical", shape: "rect", color: "blue" }}
                createOrder={async () => {
                  try {
                    const res = await fetchApi("/billing/paypal/create-order", {
                      method: "POST",
                      body: JSON.stringify({ plan: upgradePlan }),
                    }, workspaceId);
                    return res.id;
                  } catch (err: any) {
                    toast.error(err.message || "Failed to create PayPal order");
                    throw err;
                  }
                }}
                onApprove={async (data) => {
                  try {
                    const captureRes = await fetchApi("/billing/paypal/capture-order", {
                      method: "POST",
                      body: JSON.stringify({ orderId: data.orderID, plan: upgradePlan }),
                    }, workspaceId);
                    if (captureRes.status === "COMPLETED") {
                      toast.success("Payment successful!");
                      setUpgradePlan(null);
                      window.location.reload();
                    } else {
                      toast.error("Payment not completed.");
                    }
                  } catch (err: any) {
                    toast.error(err.message || "Failed to capture payment");
                  }
                }}
              />
            </PayPalScriptProvider>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
