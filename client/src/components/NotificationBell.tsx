import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { apiFetch } from "../lib/api";
import { messageFor } from "../lib/errors";
import { formatDateTime } from "../lib/format";
import type { NotificationView, Role } from "../lib/types";

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
        className="relative rounded p-1.5 text-neutral-600 hover:text-neutral-900"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] leading-4 font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          role="region"
          aria-label="Notifications"
          className="absolute right-0 z-10 mt-2 w-80 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg"
        >
          <h2 className="border-b border-neutral-200 px-4 py-2 text-sm font-medium">Notifications</h2>
          {notifications.isError && (
            <p role="alert" className="px-4 py-3 text-sm text-red-800">
              {messageFor(notifications.error)}
            </p>
          )}
          {notifications.isSuccess && items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-neutral-500">No notifications yet.</p>
          )}
          {items.length > 0 && (
            <ul className="max-h-96 divide-y divide-neutral-100 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    to={ticketPath(role, n.ticket.id)}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 text-sm hover:bg-neutral-50 ${fresh.has(n.id) || n.readAt === null ? "bg-blue-50" : ""}`}
                  >
                    <p className="text-neutral-900">{n.message}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      <time dateTime={n.createdAt}>{formatDateTime(n.createdAt)}</time>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
