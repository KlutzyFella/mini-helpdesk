import { Link, NavLink, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { homeFor } from "../auth/guards";
import type { Role } from "../lib/types";
import { NotificationBell } from "./NotificationBell";
import { BrandMark, Icon, type IconName } from "./ui/Icon";
import { WakeBanner } from "./WakeBanner";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { to: "/admin/tickets", label: "All tickets", icon: "list" },
    { to: "/admin", label: "Dashboard", icon: "chart", end: true },
  ],
  USER: [
    { to: "/tickets", label: "My tickets", icon: "list", end: true },
    { to: "/tickets/new", label: "New ticket", icon: "plus" },
  ],
};

// A tab whose active bar sits on the header's bottom edge.
const tab = ({ isActive }: { isActive: boolean }) =>
  `relative inline-flex h-12 items-center gap-2 px-1 text-sm font-medium transition-colors duration-150 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full sm:h-14 ${
    isActive ? "text-ink after:bg-accent" : "text-ink-2 hover:text-ink after:bg-transparent"
  }`;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

function NavTabs({ items, withIcons }: { items: NavItem[]; withIcons: boolean }) {
  return items.map((item) => (
    <NavLink key={item.to} to={item.to} end={item.end} className={tab}>
      {withIcons && <Icon name={item.icon} className="size-4" />}
      {item.label}
    </NavLink>
  ));
}

export function Layout() {
  const { user, logout } = useAuth();
  const items = user ? NAV[user.role] : [];
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-3 py-2 text-sm font-medium shadow-pop focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <WakeBanner />
      <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-4 sm:px-6">
          <Link to={user ? homeFor(user.role) : "/"} className="flex h-14 shrink-0 items-center gap-2.5 rounded-md">
            <BrandMark className="size-7" />
            <span className="font-semibold tracking-[-0.01em] text-ink">Mini Helpdesk</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-6 sm:flex">
            <NavTabs items={items} withIcons={false} />
          </nav>

          <div className="ml-auto flex items-center gap-1">
            {user && <NotificationBell role={user.role} />}
            {user && (
              <span className="ml-2 hidden items-center gap-2.5 border-l border-line pl-4 md:flex">
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink"
                >
                  {initials(user.name)}
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-medium text-ink">{user.name}</span>
                  <span className="block text-xs text-ink-3">{user.role === "ADMIN" ? "Admin" : "Requester"}</span>
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              aria-label="Log out"
              title="Log out"
              className="ml-1 grid size-10 place-items-center rounded-lg text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              <Icon name="logout" className="size-[18px]" />
            </button>
          </div>
        </div>

        <nav aria-label="Main" className="border-t border-line sm:hidden">
          <div className="mx-auto flex max-w-6xl gap-6 px-4">
            <NavTabs items={items} withIcons />
          </div>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-8 pb-20 outline-none sm:px-6 sm:pt-10">
        <Outlet />
      </main>
    </div>
  );
}
