import { createFileRoute } from "@tanstack/react-router";
import { User, KeyRound, Github, Send, Bell, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — DevReview AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings" description="Manage your profile, integrations and notifications." />
      <div className="p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/40">
            <TabsTrigger value="profile"><User className="mr-1.5 h-3.5 w-3.5" />Profile</TabsTrigger>
            <TabsTrigger value="api"><KeyRound className="mr-1.5 h-3.5 w-3.5" />API Keys</TabsTrigger>
            <TabsTrigger value="github"><Github className="mr-1.5 h-3.5 w-3.5" />GitHub</TabsTrigger>
            <TabsTrigger value="telegram"><Send className="mr-1.5 h-3.5 w-3.5" />Telegram</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="mr-1.5 h-3.5 w-3.5" />Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="glass max-w-2xl p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16"><AvatarFallback className="bg-gradient-to-br from-primary to-accent text-lg font-bold text-primary-foreground">JD</AvatarFallback></Avatar>
                <div>
                  <h3 className="font-display text-lg font-semibold">Jane Developer</h3>
                  <p className="text-sm text-muted-foreground">jane@acme.dev</p>
                  <Button size="sm" variant="outline" className="mt-2">Upload avatar</Button>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><Label>Full name</Label><Input className="mt-1.5" defaultValue="Jane Developer" /></div>
                <div><Label>Email</Label><Input className="mt-1.5" defaultValue="jane@acme.dev" /></div>
                <div><Label>Role</Label><Input className="mt-1.5" defaultValue="Engineering Lead" /></div>
                <div><Label>Timezone</Label><Input className="mt-1.5" defaultValue="Europe/Paris" /></div>
              </div>
              <div className="mt-6 flex justify-end"><Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground">Save changes</Button></div>
            </Card>
          </TabsContent>

          <TabsContent value="api">
            <Card className="glass max-w-2xl p-6">
              <h3 className="font-display font-semibold">API Keys</h3>
              <p className="text-sm text-muted-foreground">Use these keys to access the DevReview AI API from your CI/CD.</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <Badge>Production</Badge>
                  <code className="flex-1 font-mono text-xs">{show ? "drai_live_pk_a8f93k29sj30...abc1" : "drai_live_pk_•••••••••••••••••••"}</code>
                  <Button size="icon" variant="ghost" onClick={() => setShow(!show)}>{show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                  <Button size="icon" variant="ghost"><Copy className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <Badge variant="secondary">Staging</Badge>
                  <code className="flex-1 font-mono text-xs">drai_test_pk_•••••••••••••••••••</code>
                  <Button size="icon" variant="ghost"><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <Button className="mt-4" variant="outline">Generate new key</Button>
            </Card>
          </TabsContent>

          <TabsContent value="github">
            <Card className="glass max-w-2xl p-6">
              <h3 className="font-display font-semibold">GitHub Configuration</h3>
              <p className="mt-1 text-sm text-muted-foreground">Connected to acme organization • 12 repos</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <span className="text-sm">Auto-review pull requests</span><Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <span className="text-sm">Block merge on critical findings</span><Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <span className="text-sm">Post review summary as PR comment</span><Switch defaultChecked />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="telegram">
            <Card className="glass max-w-2xl p-6">
              <h3 className="font-display font-semibold">Telegram Configuration</h3>
              <div className="mt-4 space-y-3">
                <div><Label>Bot token</Label><Input className="mt-1.5 font-mono" type="password" defaultValue="•••••••••••••" /></div>
                <div><Label>Default chat ID</Label><Input className="mt-1.5 font-mono" defaultValue="-1001234567890" /></div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <span className="text-sm">Notify on review completion</span><Switch defaultChecked />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="glass max-w-2xl p-6">
              <h3 className="font-display font-semibold">Notifications</h3>
              <div className="mt-4 space-y-3">
                {["Email digest","Slack alerts","Telegram alerts","Critical findings only","Weekly summary"].map((n) => (
                  <div key={n} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                    <span className="text-sm">{n}</span><Switch defaultChecked />
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
