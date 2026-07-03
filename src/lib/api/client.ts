export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

export async function fetchApi(path: string, options: RequestInit = {}, workspaceId?: string) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  // Read token and workspaceId directly from localStorage to avoid circular dependency with auth-store
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    
    // Fallback to explicit workspaceId if provided, otherwise check localStorage
    const wsId = workspaceId || localStorage.getItem("workspaceId");
    if (wsId) headers.set("x-workspace-id", wsId);
  } else {
    if (workspaceId) headers.set("x-workspace-id", workspaceId);
  }

  const response = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || error.message || "An API error occurred");
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
