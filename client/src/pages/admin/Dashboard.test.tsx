import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TicketStats } from "../../lib/types";
import { Dashboard } from "./Dashboard";

afterEach(() => vi.unstubAllGlobals());

const stats: TicketStats = {
  total: 12,
  byStatus: { OPEN: 4, IN_PROGRESS: 3, RESOLVED: 2, CLOSED: 3 },
  byPriority: { LOW: 2, MEDIUM: 5, HIGH: 4, URGENT: 1 },
  byCategory: { BUG: 5, BILLING: 2, ACCOUNT: 2, FEATURE_REQUEST: 2, OTHER: 1 },
  avgResolutionHours: 26.4,
};

function serve(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const tile = (name: string) => screen.getByRole("group", { name });

describe("Dashboard", () => {
  it("shows the tiles and one bar per status", async () => {
    const fetchMock = serve(200, { success: true, data: stats, error: null, meta: null });
    renderDashboard();

    expect(await screen.findByRole("group", { name: "Total tickets" })).toHaveTextContent("12");
    expect(tile("Open")).toHaveTextContent("4");
    expect(tile("In progress")).toHaveTextContent("3");
    expect(tile("Avg. time to resolve")).toHaveTextContent("26.4 h");
    const [url] = (fetchMock.mock.calls as unknown as [RequestInfo | URL][])[0]!;
    expect(String(url)).toContain("/api/admin/stats");

    const chart = screen.getByRole("list", { name: "Tickets by status" });
    expect(within(chart).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Open4",
      "In progress3",
      "Resolved2",
      "Closed3",
    ]);
  });

  it("says when no ticket has resolved yet", async () => {
    serve(200, { success: true, data: { ...stats, avgResolutionHours: null }, error: null, meta: null });
    renderDashboard();
    expect(await screen.findByRole("group", { name: "Avg. time to resolve" })).toHaveTextContent("No tickets resolved yet");
  });

  it("shows the error message when the request fails", async () => {
    serve(403, { success: false, data: null, error: { code: "FORBIDDEN", message: "nope" } });
    renderDashboard();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
