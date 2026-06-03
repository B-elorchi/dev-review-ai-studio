import { createFileRoute } from "@tanstack/react-router";
import { Send, Bot, Smartphone, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { telegramMessages } from "@/lib/mock-data";

export const Route = createFileRoute("/telegram")({
  head: () => ({ meta: [{ title: "Telegram — DevReview AI" }] }),
  component: TelegramPage,
});

const commands = [
  { cmd: "/review", desc: "Trigger an AI code review on a repository" },
  { cmd: "/deploy", desc: "Deploy a service to an environment" },
  { cmd: "/status", desc: "Show current build & deployment status" },
  { cmd: "/logs", desc: "Tail logs from a running service" },
  { cmd: "/agent", desc: "Talk to a specific AI agent" },
];

function TelegramPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Integration"
        title="Telegram"
        description="Control DevReview AI from your phone — anytime, anywhere."
        actions={<Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Send className="mr-1.5 h-4 w-4" />Send test message</Button>}
      />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-4">
          <Card className="glass p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="font-display text-lg font-semibold">@DevReviewAI_bot</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Connected • 4 chats active
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/40" variant="outline">Live</Badge>
            </div>
          </Card>

          <Card className="glass p-5">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Available commands</h3>
            <div className="mt-3 space-y-2">
              {commands.map((c) => (
                <div key={c.cmd} className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
                  <code className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs text-primary">{c.cmd}</code>
                  <span className="text-sm text-muted-foreground">{c.desc}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="glass p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Zap className="h-3 w-3" />Messages today</div><div className="mt-1 font-display text-2xl font-bold">128</div></Card>
            <Card className="glass p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Smartphone className="h-3 w-3" />Active users</div><div className="mt-1 font-display text-2xl font-bold">18</div></Card>
          </div>
        </div>

        {/* Right: phone mockup chat */}
        <Card className="glass overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-r from-sky-500/10 to-blue-500/10 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-500 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div><div className="text-sm font-medium">@DevReviewAI_bot</div><div className="text-[10px] text-muted-foreground">typing…</div></div>
          </div>
          <div className="space-y-3 p-4 min-h-[440px] bg-[oklch(0.13_0.02_265)]">
            {telegramMessages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${m.from === "user" ? "bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-br-sm" : "bg-muted/60 rounded-bl-sm"}`}>
                  {m.text}
                  <div className={`mt-0.5 text-[10px] ${m.from === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border/60 p-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
              <input placeholder="Message" disabled className="flex-1 bg-transparent text-sm outline-none" />
              <Send className="h-4 w-4 text-primary" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
