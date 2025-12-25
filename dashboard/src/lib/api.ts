import { getAccessToken, refreshAccessToken, getCurrentSiteId } from "./auth";

const API_BASE = "http://api.publickeyboard.com";

export interface Stats {
  site_id: string;
  total_events: number;
  total_sessions: number;
  active_sessions: number;
  ended_sessions: number;
  heatmap_points: number;
  avg_session_duration_ms: number | null;
  events_by_type: Record<string, number>;
}

export interface Session {
  session_id: string;
  visitor_id: string;
  first_seen: string | null;
  last_seen: string | null;
  user_agent: string | null;
  status: "active" | "ended" | "expired";
  duration_ms: number | null;
  engagement_time_ms: number | null;
  event_count: number;
}

export interface SessionDetail {
  session_id: string;
  site_id: string;
  visitor_id: string;
  user_agent: string | null;
  language: string | null;
  platform: string | null;
  screen_resolution: string | null;
  first_seen: string | null;
  last_seen: string | null;
  status: "active" | "ended" | "expired";
  duration_ms: number | null;
  engagement_time_ms: number | null;
  final_scroll_depth: number | null;
  total_events: number;
  heatmap_points: number;
  events_by_type: Record<string, number>;
  pages_visited: string[];
  events: Array<{
    type: string;
    timestamp: string | null;
    page_url: string;
    data: Record<string, unknown> | null;
  }>;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
}

export interface HeatmapData {
  session_id: string;
  site_id: string;
  page_url: string | null;
  total_points: number;
  heatmap: HeatmapPoint[];
}

async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  let res = await fetch(url, { ...options, headers });

  // Try refresh if access token expired
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (!token) {
      throw new Error("Session expired");
    }

    res = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });
  }

  return res;
}

export async function getStats(siteId?: string): Promise<Stats> {
  const site = siteId || getCurrentSiteId();
  if (!site) throw new Error("No site selected");

  const res = await authFetch(`${API_BASE}/stats?site_id=${site}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch stats");
  }
  return res.json();
}

export async function getSessions(
  siteId: string,
  limit = 50,
  status?: "active" | "ended"
): Promise<{ site_id: string; sessions: Session[] }> {
  const params = new URLSearchParams({
    site_id: siteId,
    limit: limit.toString(),
  });
  if (status) params.append("status", status);

  const res = await authFetch(`${API_BASE}/sessions?${params}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch sessions");
  }
  return res.json();
}

export async function getSession(
  siteId: string,
  sessionId: string
): Promise<SessionDetail> {
  const res = await authFetch(
    `${API_BASE}/sessions/${sessionId}?site_id=${siteId}`
  );
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch session");
  }
  return res.json();
}

export async function getHeatmap(
  siteId: string,
  sessionId: string,
  pageUrl?: string
): Promise<HeatmapData> {
  const params = new URLSearchParams({ site_id: siteId });
  if (pageUrl) params.append("page_url", pageUrl);

  const res = await authFetch(`${API_BASE}/heatmap/${sessionId}?${params}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch heatmap");
  }
  return res.json();
}
