import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { fetchApi } from "@/lib/api/client";
import { toast } from "sonner";
import { useNotifStore, notifTypeIcon } from "@/hooks/use-notifications";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — DevReview AI" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  // ── Shared store (kept in sync by the global WS bootstrap) ──
  const items = useNotifStore((s) => s.items);
  const markReadStore = useNotifStore((s) => s.markRead);
  const markAllReadStore = useNotifStore((s) => s.markAllRead);

  const [prefs, setPrefs] = useState<any>({});
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const navigate = useNavigate();

  // Load preferences once on mount
  useEffect(() => {
    setLoadingPrefs(true);
    fetchApi("/notifications/preferences")
      .then((r) => setPrefs(r?.preferences ?? {}))
      .catch((e) => toast.error(e?.message ?? "Failed to load preferences"))
      .finally(() => setLoadingPrefs(false));
  }, []);

  const markAllRead = async () => {
    try {
      await fetchApi("/notifications/read-all", { method: "POST" });
      markAllReadStore();
      toast.success("All marked as read");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openNotification = async (notification: any) => {
    try {
      if (!notification.read_at) {
        await fetchApi(`/notifications/${notification.id}/read`, { method: "POST" });
        markReadStore(notification.id);
      }
      if (notification.link) navigate({ to: notification.link });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update notification");
    }
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

  const NotifCard = ({ n }: { n: any }) => {
    const Icon = notifTypeIcon[n.type] ?? AlertTriangle;
    return (
      <Card
        className={`glass flex cursor-pointer items-start gap-3 p-4 transition hover:border-primary/30 ${!n.read_at ? "border-l-2 border-l-primary" : ""}`}
        onClick={() => openNotification(n)}
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${!n.read_at ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className={`text-sm ${!n.read_at ? "font-semibold" : "font-medium"}`}>{n.title}</div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {new Date(n.created_at).toLocaleString()}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>
        </div>
        {!n.read_at && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />}
      </Card>
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="All activity from your projects, agents, and integrations."
        actions={<Button variant="outline" onClick={markAllRead} disabled={items.length === 0}>Mark all as read</Button>}
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
            {items.map((n) => <NotifCard key={n.id} n={n} />)}
          </TabsContent>

          <TabsContent value="unread" className="mt-4 space-y-2">
            {unread.length === 0 && (
              <Card className="glass flex flex-col items-center justify-center p-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-3 font-display text-base font-semibold">No unread notifications</h3>
              </Card>
            )}
            {unread.map((n) => <NotifCard key={n.id} n={n} />)}
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
                    disabled={savingPrefs || loadingPrefs}
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
