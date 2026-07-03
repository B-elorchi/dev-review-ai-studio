import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { API_BASE, fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing — DevReview AI" }] }),
  component: PricingPage,
});

const tiers = [
  {
    name: "Free",
    id: "free",
    price: "$0",
    description: "Perfect for individuals and small side projects.",
    features: ["1 Workspace", "3 Projects", "10 AI Reviews / mo", "Community Support"],
  },
  {
    name: "Pro",
    id: "pro",
    price: "$15",
    description: "For professionals who need more power.",
    features: ["Unlimited Workspaces", "Unlimited Projects", "100 AI Reviews / mo", "Priority Support", "Custom Agents"],
    highlight: true,
  },
  {
    name: "Team",
    id: "team",
    price: "$49",
    description: "For scaling teams and organizations.",
    features: ["Everything in Pro", "Unlimited AI Reviews", "SSO & Advanced Security", "Dedicated Account Manager"],
  }
];

function PricingPage() {
  const { workspaceId } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);

  const handleStripeCheckout = async (plan: string) => {
    setLoading(`stripe-${plan}`);
    try {
      const data = await fetchApi("/billing/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      }, workspaceId ?? undefined);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert("Failed to initiate checkout");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0e1320] text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:py-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-muted-foreground">Choose the plan that's right for you and your team.</p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-2xl border p-8 shadow-xl backdrop-blur-sm transition-all ${
                tier.highlight 
                  ? "border-primary/50 bg-primary/5" 
                  : "border-border/50 bg-background/50"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="rounded-full bg-gradient-to-r from-primary to-accent px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
                <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                  {tier.price}
                  <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
                </div>
              </div>

              <ul className="mb-8 flex-1 space-y-4 text-sm">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.id === "free" ? (
                <Button className="w-full" variant="outline" disabled>Current Plan</Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button 
                    className={`w-full ${tier.highlight ? "bg-gradient-to-r from-primary to-accent" : ""}`}
                    onClick={() => handleStripeCheckout(tier.id)}
                    disabled={loading !== null}
                  >
                    {loading === `stripe-${tier.id}` ? "Loading..." : <><CreditCard className="mr-2 h-4 w-4" /> Subscribe with Card</>}
                  </Button>
                  
                  <div className="relative z-0 h-10 w-full overflow-hidden rounded">
                    <PayPalScriptProvider options={{ clientId: "test", intent: "capture", vault: true }}>
                      <PayPalButtons
                        style={{ layout: "horizontal", height: 40, color: "gold", tagline: false }}
                        createOrder={async () => {
                          const data = await fetchApi("/billing/paypal/create-order", {
                            method: "POST",
                            body: JSON.stringify({ plan: tier.id }),
                          }, workspaceId ?? undefined);
                          return data.id;
                        }}
                        onApprove={async (data) => {
                          await fetchApi("/billing/paypal/capture-order", {
                            method: "POST",
                            body: JSON.stringify({ orderId: data.orderID, plan: tier.id }),
                          }, workspaceId ?? undefined);
                          alert("Subscription successful!");
                        }}
                      />
                    </PayPalScriptProvider>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
