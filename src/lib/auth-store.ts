import { create } from "zustand";
import { API_BASE } from "./api/client";

interface AuthState {
  user: any | null;
  session: { access_token: string; refresh_token?: string } | null;
  profile: any | null;
  workspaceId: string | null;
  setAuth: (token: string | null, refreshToken?: string) => void;
  signOut: () => void;
  loadSession: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  workspaceId: typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null,
  setAuth: (token, refreshToken) => {
    if (token) {
      localStorage.setItem("token", token);
      if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
      set({ session: { access_token: token, refresh_token: refreshToken } });
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("workspaceId");
      set({ session: null, user: null, profile: null, workspaceId: null });
    }
  },
  signOut: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("workspaceId");
    set({ session: null, user: null, profile: null, workspaceId: null });
    window.location.href = "/auth";
  },
  refreshSession: async () => {
    if (typeof window === "undefined") return false;
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      
      if (!response.ok) throw new Error("Refresh failed");
      const data = await response.json();
      
      localStorage.setItem("token", data.session.access_token);
      if (data.session.refresh_token) {
        localStorage.setItem("refresh_token", data.session.refresh_token);
      }
      set({ session: data.session, user: data.user });
      return true;
    } catch {
      get().signOut();
      return false;
    }
  },
  loadSession: async () => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    let token = params.get("token") || localStorage.getItem("token");
    let refreshToken = params.get("refresh_token") || localStorage.getItem("refresh_token");

    if (token) {
      if (params.get("token")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      localStorage.setItem("token", token);
      if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
      set({ session: { access_token: token, refresh_token: refreshToken || undefined } });

      try {
        const response = await fetch(`${API_BASE}/auth/session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        
        // If unauthorized, try to refresh
        if (response.status === 401 && refreshToken) {
          const refreshed = await get().refreshSession();
          if (!refreshed) throw new Error("Invalid session");
          // Re-fetch profile and workspace with new token handled by refreshSession
          token = localStorage.getItem("token")!; 
        } else if (!response.ok) {
          throw new Error("Invalid session");
        }
        
        if (response.ok) {
           const data = await response.json();
           set({ user: data.user, profile: data.profile });
        }

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
        get().signOut();
      }
    }
  },
}));

// Initialize session
if (typeof window !== "undefined") {
  useAuthStore.getState().loadSession();
}
