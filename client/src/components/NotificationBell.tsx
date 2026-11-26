import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { apiFetch } from "../lib/api";
import { messageFor } from "../lib/errors";
import { formatDateTime } from "../lib/format";
import type { NotificationView, Role } from "../lib/types";
import { Icon } from "./ui/Icon";

const POLL_MS = 30_000;
const QUERY_KEY = ["notifications"];

const fetchNotifications = () => apiFetch<NotificationView[], { unreadCount: number }>("/api/notifications");
const readAll = (before: string) =>
  apiFetch<{ updated: number }>("/api/notifications/read-all", { method: "PATCH", body: { before } });

const ticketPath = (role: Role, ticketId: string) =>
  role === "ADMIN" ? `/admin/tickets/${ticketId}` : `/tickets/${ticketId}`;

interface NotificationBellProps {
  role: Role;
}

export function NotificationBell({ role }: NotificationBellProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  // Ids that were unread when the panel opened, so they stay highlighted after they are marked read.
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const root = useRef<HTMLDivElement>(null);

  const notifications = useQuery({ queryKey: QUERY_KEY, queryFn: fetchNotifications, refetchInterval: POLL_MS });
  const items = notifications.data?.data ?? [];
  const unreadCount = notifications.data?.meta?.unreadCount ?? 0;

  const markRead = useMutation({
    mutationFn: readAll,
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  function toggle() {
    if (open) return setOpen(false);
    setFresh(new Set(items.filter((n) => n.readAt === null).map((n) => n.id)));
    setOpen(true);
    // Items come newest first. The cutoff keeps a notification that arrives mid-click unread.
    const newest = items[0];
    if (unreadCount > 0 && newest) markRead.mutate(newest.createdAt);
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={notifications.isSuccess ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className={`relative grid size-10 place-items-center rounded-lg transition-colors duration-150 hover:bg-surface-2 hover:text-ink ${
          open ? "bg-surface-2 text-ink" : "text-ink-2"
        }`}
      >
        <Icon name="bell" className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] rounded-full bg-danger px-1 text-center text-[11px] leading-[18px] font-semibold text-on-accent tabular ring-2 ring-surface">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          role="region"
          aria-label="Notifications"
          className="animate-rise-in fixed inset-x-3 top-16 z-30 overflow-hidden rounded-xl border border-line bg-surface shadow-pop sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[23rem]"
        >
          <header className="flex items-baseline justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Notifications</h2>
            {fresh.size > 0 && <span className="text-xs text-ink-3 tabular">{fresh.size} new</span>}
          </header>
          {notifications.isError && (
            <p role="alert" className="px-4 py-3 text-sm text-danger">
              {messageFor(notifications.error)}
            </p>
          )}
          {notifications.isSuccess && items.length === 0 && (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <Icon name="bell" className="size-5 text-ink-3" />
              <p className="mt-3 text-sm text-ink-2">No notifications yet.</p>
              <p className="mt-1 text-xs text-ink-3">Updates on your tickets will show up here.</p>
            </div>
          )}
          {items.length > 0 && (
            <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto overscroll-contain">
              {items.map((n) => {
                const unread = fresh.has(n.id) || n.readAt === null;
                return (
                  <li key={n.id}>
                    <Link
                      to={ticketPath(role, n.ticket.id)}
                      onClick={() => setOpen(false)}
                      className={`flex gap-3 px-4 py-3 text-sm transition-colors duration-150 hover:bg-surface-2 focus-visible:-outline-offset-2 ${
                        unread ? "bg-accent-soft/60" : ""
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? "bg-accent" : "bg-transparent"}`}
                      />
                      <span className="min-w-0">
                        {unread && <span className="sr-only">Unread: </span>}
                        <span className={`block ${unread ? "font-medium text-ink" : "text-ink-2"}`}>{n.message}</span>
                        <time dateTime={n.createdAt} className="mt-1 block text-xs text-ink-3">
                          {formatDateTime(n.createdAt)}
                        </time>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
