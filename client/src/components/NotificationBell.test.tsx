import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NotificationView, Role } from "../lib/types";
import { NotificationBell } from "./NotificationBell";

afterEach(() => vi.unstubAllGlobals());

const note = (id: string, readAt: string | null, createdAt = "2026-01-01T00:00:00.000Z"): NotificationView => ({
  id,
  type: "STATUS_CHANGED",
  message: `Message ${id}`,
  readAt,
  createdAt,
  ticket: { id: `ticket-${id}`, title: `Ticket ${id}` },
});

// A fake notifications API: GET lists; PATCH read-all marks unread rows up to `before`, plus any `unseen` older ones.
function serveNotifications(initial: NotificationView[], unseen = 0) {
  let rows = initial;
  let hidden = unseen;
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith("/api/notifications/read-all") && init?.method === "PATCH") {
      const { before } = JSON.parse(String(init.body)) as { before: string };
      rows = rows.map((r) => (r.readAt === null && r.createdAt <= before ? { ...r, readAt: "2026-02-01T00:00:00.000Z" } : r));
      hidden = 0;
      return new Response(JSON.stringify({ success: true, data: { updated: 1 }, error: null, meta: null }));
    }
    const unreadCount = rows.filter((r) => r.readAt === null).length + hidden;
    return new Response(JSON.stringify({ success: true, data: rows, error: null, meta: { unreadCount } }));
  });
  vi.stubGlobal("fetch", fetchMock);
  const patchBodies = () =>
    (fetchMock.mock.calls as unknown as [RequestInfo | URL, RequestInit | undefined][])
      .filter(([, init]) => init?.method === "PATCH")
      .map(([, init]) => JSON.parse(String(init?.body)));
  return { patchBodies };
}

function renderBell(role: Role = "USER") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NotificationBell role={role} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("NotificationBell", () => {
  it("shows the unread count", async () => {
    serveNotifications([note("a", null), note("b", null), note("c", null), note("d", "2026-01-01T00:00:00Z")]);
    renderBell();
    expect(await screen.findByRole("button", { name: "Notifications, 3 unread" })).toHaveTextContent("3");
  });

  it("marks everything up to the newest shown as read when opened, so the count drops to 0", async () => {
    const newest = "2026-01-01T00:00:03.000Z";
    const api = serveNotifications(
      [note("c", null, newest), note("b", null, "2026-01-01T00:00:02.000Z"), note("a", "2026-01-01T00:00:05.000Z", "2026-01-01T00:00:01.000Z")],
      30,
    );
    renderBell();
    await userEvent.click(await screen.findByRole("button", { name: "Notifications, 32 unread" }));

    const panel = screen.getByRole("region", { name: "Notifications" });
    expect(within(panel).getAllByRole("link")).toHaveLength(3);
    expect(await screen.findByRole("button", { name: "Notifications, 0 unread" })).toBeInTheDocument();
    expect(api.patchBodies()).toEqual([{ before: newest }]);
  });

  it("sends nothing when opened with nothing unread", async () => {
    const api = serveNotifications([note("a", "2026-01-01T00:00:05.000Z")]);
    renderBell();
    await userEvent.click(await screen.findByRole("button", { name: "Notifications, 0 unread" }));
    expect(screen.getByRole("region", { name: "Notifications" })).toBeInTheDocument();
    expect(api.patchBodies()).toEqual([]);
  });

  it("links each notification to the ticket page for the reader's role", async () => {
    serveNotifications([note("a", null)]);
    const { unmount } = renderBell("USER");
    await userEvent.click(await screen.findByRole("button", { name: /^Notifications/ }));
    expect(screen.getByRole("link", { name: /Message a/ })).toHaveAttribute("href", "/tickets/ticket-a");
    unmount();

    serveNotifications([note("a", null)]);
    renderBell("ADMIN");
    await userEvent.click(await screen.findByRole("button", { name: /^Notifications/ }));
    expect(screen.getByRole("link", { name: /Message a/ })).toHaveAttribute("href", "/admin/tickets/ticket-a");
  });

  it("says so when there are none, and closes on Escape", async () => {
    serveNotifications([]);
    renderBell();
    await userEvent.click(await screen.findByRole("button", { name: "Notifications, 0 unread" }));
    expect(screen.getByText("No notifications yet.")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument());
  });
});
