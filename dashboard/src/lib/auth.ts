const API_BASE = "https://api.publickeyboard.com";

export interface User {
  user_id: string;
  email: string;
  name: string;
  avatar_url: string;
  email_verified: boolean;
  created_at: string;
}

export interface Website {
  site_id: string;
  name: string;
  domain: string;
  created_at: string;
}

export interface WebsiteWithApiKey extends Website {
  api_key: string;
}

export interface WebsiteWithScript extends Website {
  script_tag: string;
}

export interface ApiKey {
  key_id: string;
  site_id: string;
  key_prefix: string;
  name: string;
  permissions: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

// Token storage
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function setTokens(tokens: AuthTokens): void {
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("refresh_token", tokens.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("current_site_id");
}

export function getCurrentSiteId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("current_site_id");
}

export function setCurrentSiteId(siteId: string): void {
  localStorage.setItem("current_site_id", siteId);
}

// Auth API calls
export async function signup(
  email: string,
  password: string,
  name?: string
): Promise<{ user: User; tokens: AuthTokens }> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Signup failed");
  }

  const data = await res.json();
  setTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  return {
    user: data.user,
    tokens: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    },
  };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: User; tokens: AuthTokens }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Invalid credentials");
  }

  const data = await res.json();
  setTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  return {
    user: data.user,
    tokens: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    },
  };
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Ignore errors during logout
    }
  }
  clearTokens();
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    setTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    return data.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  let token = getAccessToken();
  if (!token) return null;

  let res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Try refresh if access token expired
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (!token) return null;

    res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  if (!res.ok) return null;
  return res.json();
}

// Website API calls
export async function getWebsites(): Promise<Website[]> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}/websites/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) throw new Error("Session expired");

    const retryRes = await fetch(`${API_BASE}/websites/`, {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    if (!retryRes.ok) throw new Error("Failed to fetch websites");
    return retryRes.json();
  }

  if (!res.ok) throw new Error("Failed to fetch websites");
  return res.json();
}

export async function createWebsite(
  name: string,
  domain: string
): Promise<WebsiteWithApiKey> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}/websites/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, domain }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to create website");
  }

  return res.json();
}

export async function getWebsite(siteId: string): Promise<WebsiteWithScript> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}/websites/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to fetch website");
  return res.json();
}

export async function deleteWebsite(siteId: string): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}/websites/${siteId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to delete website");
}

export async function getApiKeys(siteId: string): Promise<ApiKey[]> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}/websites/${siteId}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to fetch API keys");
  return res.json();
}

export async function createApiKey(
  siteId: string,
  name?: string
): Promise<{ api_key: string; key_id: string }> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}/websites/${siteId}/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: name || "Default" }),
  });

  if (!res.ok) throw new Error("Failed to create API key");
  return res.json();
}

export async function revokeApiKey(
  siteId: string,
  keyId: string
): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}/websites/${siteId}/api-keys/${keyId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to revoke API key");
}
