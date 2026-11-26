import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import type { Role } from "../lib/types";
import { useAuth } from "./AuthContext";

export function homeFor(role: Role): string {
  return role === "ADMIN" ? "/admin/tickets" : "/tickets";
}

export function RequireAuth({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <p role="status" className="grid min-h-dvh place-items-center text-sm text-ink-3">
        Loading…
      </p>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children ?? <Outlet />;
}

export function RequireRole({ role, children }: { role: Role; children?: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children ?? <Outlet />;
}
