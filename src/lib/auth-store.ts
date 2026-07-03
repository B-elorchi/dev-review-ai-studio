import { create } from "zustand";
import { API_BASE } from "./api/client";

interface AuthState {
  user: any | null;
  session: { access_token: string } | null;
  profile: any | null;
  workspaceId: string | null;
  setAuth: (token: string | null) => void;
  signOut: () => void;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  workspaceId: typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null,
  setAuth: (token) => {
    if (token) {
      localStorage.setItem("token", token);
      set({ session: { access_token: token } });
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("workspaceId");
      set({ session: null, user: null, profile: null, workspaceId: null });
    }
  },
  signOut: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("workspaceId");
    set({ session: null, user: null, profile: null, workspaceId: null });
    window.location.href = "/auth";
  },
  loadSession: async () => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    let token = params.get("token") || localStorage.getItem("token");

    if (token) {
      if (params.get("token")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      localStorage.setItem("token", token);
      set({ session: { access_token: token } });

      try {
        const response = await fetch(`${API_BASE}/auth/session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Invalid session");
        const data = await response.json();
        set({ user: data.user, profile: data.profile });

        // Load workspace — prefer stored, else fetch first available
        let wsId = localStorage.getItem("workspaceId");
        if (!wsId) {
          const wsRes = await fetch(`${API_BASE}/workspaces`, {
            headers: { "Authorization": `Bearer ${token}` },
          });
          if (wsRes.ok) {
            const wsData = await wsRes.json();
            wsId = wsData.workspaces?.[0]?.id ?? null;
            if (wsId) localStorage.setItem("workspaceId", wsId);
          }
        }
        set({ workspaceId: wsId });
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("workspaceId");
        set({ session: null, user: null, profile: null, workspaceId: null });
      }
    }
  },
}));

// Initialize session
if (typeof window !== "undefined") {
  useAuthStore.getState().loadSession();
}
