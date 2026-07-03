export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

function buildHeaders(options: RequestInit, workspaceId?: string): Headers {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const wsId = workspaceId || localStorage.getItem("workspaceId");
    if (wsId) headers.set("x-workspace-id", wsId);
  } else {
    if (workspaceId) headers.set("x-workspace-id", workspaceId);
  }
  return headers;
}

export async function fetchApi(path: string, options: RequestInit = {}, workspaceId?: string) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  let response = await fetch(url, { ...options, headers: buildHeaders(options, workspaceId) });

  // Auto-refresh expired token and retry once
  if (response.status === 401 && typeof window !== "undefined") {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem("token", data.session.access_token);
        if (data.session.refresh_token) localStorage.setItem("refresh_token", data.session.refresh_token);
        // Retry with new token
        response = await fetch(url, { ...options, headers: buildHeaders(options, workspaceId) });
      } else {
        // Refresh failed — clear session
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("workspaceId");
        window.location.href = "/auth";
        throw new Error("Session expired");
      }
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || error.error || error.message || "An API error occurred");
  }

  if (response.status === 204) return null;
  return response.json();
}
