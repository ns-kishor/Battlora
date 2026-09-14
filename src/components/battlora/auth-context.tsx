"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  status: string;
  avatarUrl: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  team: { id: string; name: string; logoUrl: string | null; status: string } | null;
  unreadNotifications: number;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  team: null,
  unreadNotifications: 0,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [team, setTeam] = useState<AuthContextValue["team"]>(null);
  const [unreadNotifications, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{
        user: AuthUser | null;
        team: AuthContextValue["team"];
        unreadNotifications: number;
      }>("/api/auth/me");
      setUser(data.user);
      setTeam(data.team);
      setUnread(data.unreadNotifications ?? 0);
    } catch {
      setUser(null);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll notification badge every 30s when signed in
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(refresh, 30_000);
    return () => clearInterval(timer);
  }, [user, refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      await api("/api/auth/login", { json: { email, password } });
      await refresh();
    },
    [refresh]
  );

  const register = useCallback(
    async (name: string, email: string, phone: string, password: string) => {
      await api("/api/auth/register", { json: { name, email, phone, password } });
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { json: {} });
    setUser(null);
    setTeam(null);
    setUnread(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, team, unreadNotifications, loading, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
