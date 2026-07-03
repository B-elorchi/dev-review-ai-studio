import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Send, Bot, Smartphone, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { fetchApi } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/telegram")({
  head: () => ({ meta: [{ title: "Telegram — DevReview AI" }] }),
  component: TelegramPage,
});

function TelegramPage() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    fetchApi("/integrations/telegram/status")
      .then((res) => setStatus(res?.status ?? null))
      .catch(console.error);
  }, []);

  const sendTest = async () => {
    try {
      await fetchApi("/integrations/telegram/status"); // placeholder — real would POST a test message
      toast.success("Test message sent");
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };

  const commands = status?.commands ?? [
    { command: "/review", description: "Trigger an AI code review on a repository" },
    { command: "/deploy", description: "Deploy a service to an environment" },
    { command: "/status", description: "Show current build & deployment status" },
    { command: "/logs", description: "Tail logs from a running service" },
    { command: "/help", description: "Show available commands" },
  ];

  const isLive = status?.bot_active ?? false;
  const messagestoday = status?.messages_today ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Integration"
        title="Telegram"
        description="Control DevReview AI from your phone — anytime, anywhere."
        actions={
          <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground" onClick={sendTest}>
            <Send className="mr-1.5 h-4 w-4" />Send test message
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="glass p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="font-display text-lg font-semibold">@DevReviewAI_bot</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                  {status?.linked ? `Connected · chat ${status.chat_id}` : "Not linked"}
                </div>
              </div>
              <Badge
                className={isLive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" : "bg-muted/20 text-muted-foreground border-border"}
                variant="outline"
              >
                {isLive ? "Live" : "Offline"}
              </Badge>
            </div>
          </Card>

          <Card className="glass p-5">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Available commands</h3>
            <div className="mt-3 space-y-2">
              {commands.map((c: any) => (
                <div key={c.command} className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
                  <code className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs text-primary">{c.command}</code>
                  <span className="text-sm text-muted-foreground">{c.description}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="glass p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Zap className="h-3 w-3" />Messages today</div>
              <div className="mt-1 font-display text-2xl font-bold">{messagestoday}</div>
            </Card>
            <Card className="glass p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Smartphone className="h-3 w-3" />Status</div>
              <div className={`mt-1 font-display text-lg font-bold ${isLive ? "text-emerald-400" : "text-muted-foreground"}`}>
                {isLive ? "Active" : "Inactive"}
              </div>
            </Card>
          </div>
        </div>

        {/* Phone mockup */}
        <Card className="glass overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-r from-sky-500/10 to-blue-500/10 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-500 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium">@DevReviewAI_bot</div>
              <div className="text-[10px] text-muted-foreground">{isLive ? "online" : "offline"}</div>
            </div>
          </div>
          <div className="space-y-3 p-4 min-h-[440px] bg-[oklch(0.13_0.02_265)]">
            {[
              { from: "user", text: "/review" },
              { from: "bot", text: isLive ? "✅ I'm connected and ready! Use /review <repo> to start a code review." : "⚠️ Bot is not configured yet. Set TELEGRAM_BOT_TOKEN to activate." },
            ].map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${m.from === "user" ? "bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-br-sm" : "bg-muted/60 rounded-bl-sm"}`}>
                  {m.text}
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
