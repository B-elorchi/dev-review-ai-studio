import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Send, Bot, Smartphone, Zap, Link as LinkIcon, Save, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Switch } from "@/components/ui/switch";
import { fetchApi } from "@/lib/api/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/telegram")({
  head: () => ({ meta: [{ title: "Telegram — DevReview AI" }] }),
  component: TelegramPage,
});

type Message = { id: string; direction: "inbound" | "outbound"; text: string; created_at: string };

function TelegramPage() {
  const [status, setStatus] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prefs, setPrefs] = useState<any>({});
  const [inputText, setInputText] = useState("");
  const [chatIdInput, setChatIdInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const [{ status: s }, { messages: m }, { preferences: p }] = await Promise.all([
        fetchApi("/integrations/telegram/status"),
        fetchApi("/integrations/telegram/messages").catch(() => ({ messages: [] })),
        fetchApi("/integrations/telegram/preferences").catch(() => ({ preferences: {} }))
      ]);
      setStatus(s);
      setMessages(m);
      setPrefs(p);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const linkAccount = async () => {
    try {
      await fetchApi("/integrations/telegram/link", {
        method: "POST",
        body: JSON.stringify({ chat_id: chatIdInput }),
      });
      toast.success("Telegram account linked successfully!");
      loadData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to link account");
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const txt = inputText;
    setInputText("");
    try {
      const res = await fetchApi("/integrations/telegram/messages", {
        method: "POST",
        body: JSON.stringify({ text: txt }),
      });
      setMessages((prev) => [...prev, res.message]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send message");
      setInputText(txt);
    }
  };

  const togglePref = async (key: string) => {
    const newVal = !prefs[key];
    setPrefs((p: any) => ({ ...p, [key]: newVal }));
    try {
      await fetchApi("/integrations/telegram/preferences", {
        method: "PUT",
        body: JSON.stringify({ [key]: newVal }),
      });
      toast.success("Preferences updated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update preference");
      setPrefs((p: any) => ({ ...p, [key]: !newVal }));
    }
  };

  const isLive = status?.bot_active ?? false;
  const isLinked = status?.linked ?? false;

  return (
    <div>
      <PageHeader
        eyebrow="Integration"
        title="Telegram"
        description="Control DevReview AI from your phone — anytime, anywhere."
      />
      
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="glass p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="font-display text-lg font-semibold">@DevReviewAI_bot</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                  {isLinked ? `Connected · chat ${status.chat_id}` : "Not linked"}
                </div>
              </div>
              <Badge className={isLive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" : "bg-muted/20 text-muted-foreground border-border"} variant="outline">
                {isLive ? "Live" : "Offline"}
              </Badge>
            </div>
          </Card>

          {!isLinked && (
            <Card className="glass p-5 border-blue-500/30 bg-blue-500/5">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                <LinkIcon className="h-4 w-4" /> Link Your Account
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                To receive notifications, enter your Telegram Chat ID. You can find it by messaging <code className="text-primary">@userinfobot</code>.
              </p>
              <div className="mt-4 flex gap-2">
                <Input placeholder="e.g. 123456789" value={chatIdInput} onChange={(e) => setChatIdInput(e.target.value)} />
                <Button onClick={linkAccount} variant="secondary">Link</Button>
              </div>
            </Card>
          )}

          {isLinked && (
            <Card className="glass p-5">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Notification Preferences
              </h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Code Review Completed</span>
                  <Switch checked={prefs.push_review_complete ?? true} onCheckedChange={() => togglePref("push_review_complete")} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">New Pull Request Opened</span>
                  <Switch checked={prefs.push_pr_opened ?? false} onCheckedChange={() => togglePref("push_pr_opened")} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Deployment Failed</span>
                  <Switch checked={prefs.push_deploy_failed ?? true} onCheckedChange={() => togglePref("push_deploy_failed")} />
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Card className="glass p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Zap className="h-3 w-3" />Messages today</div>
              <div className="mt-1 font-display text-2xl font-bold">{status?.messages_today ?? 0}</div>
            </Card>
            <Card className="glass p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Smartphone className="h-3 w-3" />Status</div>
              <div className={`mt-1 font-display text-lg font-bold ${isLive ? "text-emerald-400" : "text-muted-foreground"}`}>
                {isLive ? "Active" : "Inactive"}
              </div>
            </Card>
          </div>
        </div>

        {/* Live Chat Mirror Phone Mockup */}
        <Card className="glass overflow-hidden p-0 flex flex-col h-[600px]">
          <div className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-r from-sky-500/10 to-blue-500/10 px-4 py-3 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-500 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium">@DevReviewAI_bot</div>
              <div className="text-[10px] text-muted-foreground">{isLive ? "online" : "offline"}</div>
            </div>
          </div>
          
          <div ref={chatRef} className="flex-1 overflow-y-auto space-y-4 p-4 bg-[oklch(0.13_0.02_265)]">
            {!isLinked && (
              <div className="text-center text-xs text-muted-foreground my-4 p-2 bg-muted/20 rounded">
                Account not linked. Chat history unavailable.
              </div>
            )}
            
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "inbound" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words shadow-sm ${m.direction === "inbound" ? "bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-br-sm" : "bg-muted/80 rounded-bl-sm"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {messages.length === 0 && isLinked && (
              <div className="text-center text-xs text-muted-foreground my-4">No messages yet. Send one below!</div>
            )}
          </div>
          
          <form onSubmit={sendMessage} className="border-t border-border/60 p-3 shrink-0 bg-background/50 backdrop-blur-md">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
              <input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isLinked ? "Message bot..." : "Link account first"} 
                disabled={!isLinked} 
                className="flex-1 bg-transparent text-sm outline-none disabled:opacity-50" 
              />
              <button type="submit" disabled={!isLinked || !inputText.trim()} className="text-primary hover:text-primary/80 disabled:opacity-50 transition-colors">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
