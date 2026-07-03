import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FolderKanban,
  GitPullRequest,
  MessageSquare,
  Rocket,
  ShieldAlert,
  Users,
} from "lucide-react";
import { API_BASE, fetchApi } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read_at: string | null;
  created_at: string;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

export const notifTypeIcon: Record<string, React.FC<{ className?: string }>> = {
  review: ShieldAlert,
  pr: GitPullRequest,
  devops: Rocket,
  agent: Bot,
  project: FolderKanban,
  team: Users,
  success: CheckCircle2,
  comment: MessageSquare,
  alert: AlertTriangle,
};

// ─── Zustand store (global, singleton) ───────────────────────────────────────

interface NotifStore {
  items: AppNotification[];
  setItems: (items: AppNotification[]) => void;
  addItem: (item: AppNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotifStore = create<NotifStore>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  addItem: (item) =>
    set((state) => {
      if (state.items.some((n) => n.id === item.id)) return state;
      return { items: [item, ...state.items] };
    }),
  markRead: (id) =>
    set((state) => ({
      items: state.items.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ),
    })),
  markAllRead: () =>
    set((state) => ({
      items: state.items.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    })),
}));

// ─── Provider hook (mount once at app level) ─────────────────────────────────

let wsInitialised = false;

export function useNotificationsProvider() {
  const addItem = useNotifStore((s) => s.addItem);
  const setItems = useNotifStore((s) => s.setItems);
  const reconnectTimer = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi("/notifications");
      setItems(res?.notifications ?? []);
    } catch (err) {
      console.error("[notifications] load error", err);
    }
  }, [setItems]);

  useEffect(() => {
    // Load existing notifications on mount
    load();

    if (wsInitialised) return;
    wsInitialised = true;

    let shouldReconnect = true;

    const connect = () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const wsUrl = new URL("notifications/ws", `${API_BASE.replace(/\/$/, "")}/`);
      wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
      wsUrl.searchParams.set("token", token);

      const socket = new WebSocket(wsUrl.toString());
      socketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type !== "notification" || !message.notification) return;

          const notif: AppNotification = message.notification;
          addItem(notif);

          // Fire a toast for each incoming real-time notification
          const Icon = notifTypeIcon[notif.type] ?? AlertTriangle;
          toast(notif.title, {
            description: notif.body,
            duration: 6000,
            icon: <Icon className="h-4 w-4 text-primary" />,
            action: notif.link
              ? {
                  label: "View",
                  onClick: () => {
                    window.location.href = notif.link!;
                  },
                }
              : undefined,
          });
        } catch (err) {
          console.error("[notifications] ws parse error", err);
        }
      };

      socket.onclose = () => {
        if (shouldReconnect) {
          reconnectTimer.current = window.setTimeout(connect, 3_000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      wsInitialised = false;
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, [addItem, load]);
}
