"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  User,
  Website,
  getCurrentUser,
  getWebsites,
  login as authLogin,
  signup as authSignup,
  logout as authLogout,
  getCurrentSiteId,
  setCurrentSiteId,
  clearTokens,
  setTokens,
} from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  websites: Website[];
  currentWebsite: Website | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  setCurrentWebsite: (website: Website) => void;
  refreshUser: () => Promise<void>;
  refreshWebsites: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [currentWebsite, setCurrentWebsiteState] = useState<Website | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const refreshWebsites = useCallback(async () => {
    try {
      const sites = await getWebsites();
      setWebsites(sites);

      // Set current website
      const savedSiteId = getCurrentSiteId();
      const saved = sites.find((w) => w.site_id === savedSiteId);
      if (saved) {
        setCurrentWebsiteState(saved);
      } else if (sites.length > 0) {
        setCurrentWebsiteState(sites[0]);
        setCurrentSiteId(sites[0].site_id);
      } else {
        setCurrentWebsiteState(null);
      }
    } catch {
      setWebsites([]);
      setCurrentWebsiteState(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const userData = await getCurrentUser();
      if (userData) {
        setUser(userData);
        await refreshWebsites();
      } else {
        setUser(null);
        setWebsites([]);
        setCurrentWebsiteState(null);
      }
    } catch {
      setUser(null);
      setWebsites([]);
      setCurrentWebsiteState(null);
    } finally {
      setIsLoading(false);
    }
  }, [refreshWebsites]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { user: userData } = await authLogin(email, password);
    setUser(userData);
    await refreshWebsites();
  };

  const signup = async (email: string, password: string, name?: string) => {
    const { user: userData } = await authSignup(email, password, name);
    setUser(userData);
    await refreshWebsites();
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
    setWebsites([]);
    setCurrentWebsiteState(null);
  };

  const setCurrentWebsite = (website: Website) => {
    setCurrentWebsiteState(website);
    setCurrentSiteId(website.site_id);
  };

  // Handle OAuth callback tokens from URL
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      setTokens({ access_token: accessToken, refresh_token: refreshToken });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      refreshUser();
    }
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        websites,
        currentWebsite,
        isLoading,
        login,
        signup,
        logout,
        setCurrentWebsite,
        refreshUser,
        refreshWebsites,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
