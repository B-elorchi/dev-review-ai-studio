import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, GitPullRequest, MessageSquare, Rocket, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { fetchApi } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — DevReview AI" }] }),
  component: NotificationsPage,
});

const typeIcon: Record<string, any> = {
  review: ShieldAlert, pr: GitPullRequest, devops: Rocket, agent: Bot,
  success: CheckCircle2, comment: MessageSquare, alert: AlertTriangle,
};

function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [prefs, setPrefs] = useState<any>({});
  const [savingPrefs, setSavingPrefs] = useState(false);

  const load = async () => {
    try {
      const [notifRes, prefRes] = await Promise.all([
        fetchApi("/notifications"),
        fetchApi("/notifications/preferences"),
      ]);
      setItems(notifRes?.notifications ?? []);
      setPrefs(prefRes?.preferences ?? {});
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    try {
      await fetchApi("/notifications/read-all", { method: "POST" });
      toast.success("All marked as read");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const markRead = async (id: string) => {
    try {
      await fetchApi(`/notifications/${id}/read`, { method: "POST" });
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch {}
  };

  const savePrefs = async (key: string, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingPrefs(true);
    try {
      await fetchApi("/notifications/preferences", { method: "PATCH", body: JSON.stringify({ [key]: value }) });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPrefs(false);
    }
  };

  const unread = items.filter((n) => !n.read_at);

  const prefFields = [
    { key: "email_review_complete", label: "PR reviews completed", desc: "When an AI review finishes on your PR" },
    { key: "email_deploy_failed", label: "Critical issues", desc: "High severity findings in your code" },
    { key: "push_review_complete", label: "Agent completions", desc: "When an AI agent finishes a task" },
    { key: "push_deploy_failed", label: "Build & deploy", desc: "CI/CD failures and successes" },
    { key: "email_weekly_report", label: "Weekly digest", desc: "Summary of quality and activity" },
    { key: "push_weekly_report", label: "Product updates", desc: "New features and announcements" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="All activity from your projects, agents, and integrations."
        actions={<Button variant="outline" onClick={markAllRead}>Mark all as read</Button>}
      />

      <div className="p-6">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2">{items.length}</Badge></TabsTrigger>
            <TabsTrigger value="unread">Unread <Badge variant="secondary" className="ml-2">{unread.length}</Badge></TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-2">
            {items.length === 0 && (
              <Card className="glass flex flex-col items-center justify-center p-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-3 font-display text-base font-semibold">All caught up</h3>
                <p className="mt-1 text-sm text-muted-foreground">No notifications yet.</p>
              </Card>
            )}
            {items.map((n) => {
              const Icon = typeIcon[n.type] ?? AlertTriangle;
              return (
                <Card
                  key={n.id}
                  className={`glass flex cursor-pointer items-start gap-3 p-4 transition hover:border-primary/30 ${!n.read_at ? "border-l-2 border-l-primary" : ""}`}
                  onClick={() => !n.read_at && markRead(n.id)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{n.title}</div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>
                  </div>
                  {!n.read_at && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />}
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="unread" className="mt-4 space-y-2">
            {unread.length === 0 && (
              <Card className="glass flex flex-col items-center justify-center p-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-3 font-display text-base font-semibold">No unread notifications</h3>
              </Card>
            )}
            {unread.map((n) => {
              const Icon = typeIcon[n.type] ?? AlertTriangle;
              return (
                <Card key={n.id} className="glass flex cursor-pointer items-start gap-3 border-l-2 border-l-primary p-4" onClick={() => markRead(n.id)}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
                  <div className="flex-1"><div className="text-sm font-medium">{n.title}</div><div className="text-xs text-muted-foreground">{n.body}</div></div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="preferences" className="mt-4">
            <Card className="glass divide-y divide-border/60 p-0">
              {prefFields.map((p) => (
                <div key={p.key} className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.desc}</div>
                  </div>
                  <Switch
                    checked={!!prefs[p.key]}
                    disabled={savingPrefs}
                    onCheckedChange={(v) => savePrefs(p.key, v)}
                  />
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
