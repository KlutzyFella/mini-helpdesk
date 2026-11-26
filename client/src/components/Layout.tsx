import { NavLink, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { WakeBanner } from "./WakeBanner";

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1.5 text-sm ${isActive ? "bg-neutral-200 font-medium" : "text-neutral-600 hover:text-neutral-900"}`;

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <WakeBanner />
      <header className="border-b border-neutral-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <span className="mr-4 font-semibold">Mini Helpdesk</span>
          {user?.role === "ADMIN" ? (
            <>
              <NavLink to="/admin/tickets" className={link}>
                All tickets
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/tickets" end className={link}>
                My tickets
              </NavLink>
              <NavLink to="/tickets/new" className={link}>
                New ticket
              </NavLink>
            </>
          )}
          <span className="ml-auto text-sm text-neutral-500">{user?.name}</span>
          <button type="button" onClick={logout} className="rounded px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900">
            Log out
          </button>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
