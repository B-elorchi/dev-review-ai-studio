import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FolderGit2, ScanSearch, Workflow, Bot,
  Github, Send, BarChart3, Settings, Sparkles, GitPullRequest,
  LayoutTemplate, Bell, Users, KeyRound, CreditCard, FileLock2, Code2,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const nav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderGit2 },
  { title: "Pull Requests", url: "/pull-requests", icon: GitPullRequest },
  { title: "Code Review", url: "/code-review", icon: ScanSearch },
  { title: "DevOps Generator", url: "/devops", icon: Workflow },
  { title: "Editor", url: "/editor", icon: Code2 },
  { title: "AI Agents", url: "/agents", icon: Bot },
  { title: "Templates", url: "/templates", icon: LayoutTemplate },
];
const integrations = [
  { title: "GitHub", url: "/github", icon: Github },
  { title: "Telegram", url: "/telegram", icon: Send },
];
const system = [
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Team", url: "/team", icon: Users },
  { title: "API Keys", url: "/api-keys", icon: KeyRound },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Audit Log", url: "/audit-log", icon: FileLock2 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => url === "/" ? path === "/" : path.startsWith(url);

  const renderItems = (items: typeof nav) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
          <Link to={item.url} className="flex items-center gap-3">
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm">{item.title}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5 px-2 py-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-[0_0_20px_-4px_var(--primary)]">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-display text-sm font-bold tracking-tight">DevReview</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">AI Platform</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent><SidebarMenu>{renderItems(nav)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Integrations</SidebarGroupLabel>}
          <SidebarGroupContent><SidebarMenu>{renderItems(integrations)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>System</SidebarGroupLabel>}
          <SidebarGroupContent><SidebarMenu>{renderItems(system)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed ? (
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_var(--color-success)]" />
              <span className="text-muted-foreground">All systems operational</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /></div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
