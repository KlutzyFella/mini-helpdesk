import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TicketStatus, TicketView } from "../../lib/types";
import { TicketTriage } from "./TicketTriage";

afterEach(() => vi.unstubAllGlobals());

function ticket(status: TicketStatus, nextStatuses: TicketStatus[], priority = true): TicketView {
  return {
    id: "t1",
    title: "Printer on fire",
    description: "It is on fire.",
    category: "BUG",
    priority: "HIGH",
    status,
    createdById: "u1",
    createdBy: { id: "u1", name: "Una" },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    resolvedAt: null,
    permissions: { edit: false, priority, delete: false, comment: true, nextStatuses },
  };
}

function renderTriage(t: TicketView) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TicketTriage ticket={t} />
    </QueryClientProvider>,
  );
}

describe("TicketTriage", () => {
  it("offers the current status (disabled) plus exactly nextStatuses", () => {
    renderTriage(ticket("OPEN", ["IN_PROGRESS", "CLOSED"]));
    const select = screen.getByLabelText("Status for Printer on fire");
    const options = within(select).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Open", "In progress", "Closed"]);
    expect(options[0]).toBeDisabled();
    expect(options[1]).toBeEnabled();
    expect(options[2]).toBeEnabled();
  });

  it("shows no status select for a CLOSED ticket", () => {
    renderTriage(ticket("CLOSED", []));
    expect(screen.queryByLabelText("Status for Printer on fire")).not.toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("hides the priority select when permissions.priority is false", () => {
    renderTriage(ticket("OPEN", ["IN_PROGRESS"], false));
    expect(screen.queryByLabelText("Priority for Printer on fire")).not.toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("sends one PATCH with only the changed field", async () => {
    const t = ticket("OPEN", ["IN_PROGRESS", "CLOSED"]);
    const body = { success: true, data: { ...t, status: "IN_PROGRESS" }, error: null, meta: null };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderTriage(t);
    await userEvent.selectOptions(screen.getByLabelText("Status for Printer on fire"), "IN_PROGRESS");
    const calls = fetchMock.mock.calls as unknown as [RequestInfo | URL, RequestInit][];
    expect(calls).toHaveLength(1);
    const [url, init] = calls[0]!;
    expect(String(url)).toContain("/api/admin/tickets/t1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ status: "IN_PROGRESS" });
  });

  it("shows the error inline and keeps the server value", async () => {
    const err = { success: false, data: null, error: { code: "INVALID_TRANSITION", message: "no" } };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(err), { status: 409 })));
    renderTriage(ticket("OPEN", ["IN_PROGRESS", "CLOSED"]));
    const select = screen.getByLabelText("Status for Printer on fire");
    await userEvent.selectOptions(select, "CLOSED");
    expect(await screen.findByRole("alert")).toHaveTextContent("That status change is not allowed.");
    expect(select).toHaveValue("OPEN");
  });
});
