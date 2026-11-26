import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, getToken, onUnauthorized, setToken } from "../lib/api";
import type { AuthResult, PublicUser } from "../lib/types";

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (name: string, email: string, password: string) => Promise<PublicUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState<boolean>(() => getToken() !== null);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    onUnauthorized(clearSession);
    return () => onUnauthorized(null);
  }, [clearSession]);

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    apiFetch<PublicUser>("/api/auth/me")
      .then(({ data }) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        // a 401 already cleared the session; other failures leave the visitor signed out
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback(
    async (path: string, body: unknown) => {
      const { data } = await apiFetch<AuthResult>(path, { method: "POST", body });
      queryClient.clear();
      setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    [queryClient],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: (email, password) => startSession("/api/auth/login", { email, password }),
      register: (name, email, password) => startSession("/api/auth/register", { name, email, password }),
      logout: clearSession,
    }),
    [user, loading, startSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export { AuthContext };
export type { AuthState };
