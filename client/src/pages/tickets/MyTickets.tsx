import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { PriorityBadge } from "../../components/tickets/PriorityBadge";
import { Pagination } from "../../components/tickets/Pagination";
import { StatusBadge } from "../../components/tickets/StatusBadge";
import { TicketFilters, type TicketFilterValues } from "../../components/tickets/TicketFilters";
import { fetchTickets, type ListParams } from "../../components/tickets/ticketApi";
import { CATEGORIES, CATEGORY_LABELS, PRIORITIES, STATUSES } from "../../lib/enums";
import { messageFor } from "../../lib/errors";
import { formatDate } from "../../lib/format";

const SEARCH_DEBOUNCE_MS = 300;

function oneOf<T extends string>(allowed: readonly T[], raw: string | null): T | "" {
  return allowed.find((v) => v === raw) ?? "";
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function MyTickets() {
  const [params, setParams] = useSearchParams();
  const urlSearch = params.get("search") ?? "";
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const filters = {
    status: oneOf(STATUSES, params.get("status")),
    priority: oneOf(PRIORITIES, params.get("priority")),
    category: oneOf(CATEGORIES, params.get("category")),
  };

  // The input is local so typing is instant; the URL (and the query) follow 300 ms later.
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounced(searchInput, SEARCH_DEBOUNCE_MS);

  // Back/forward changes the URL from outside; copy it into the input, but not our own writes.
  const pushedSearch = useRef(urlSearch);
  useEffect(() => {
    if (urlSearch !== pushedSearch.current) {
      pushedSearch.current = urlSearch;
      setSearchInput(urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    const next = debouncedSearch;
    pushedSearch.current = next;
    setParams(
      (prev) => {
        if ((prev.get("search") ?? "") === next) return prev;
        const out = new URLSearchParams(prev);
        if (next) out.set("search", next);
        else out.delete("search");
        out.delete("page");
        return out;
      },
      { replace: true },
    );
  }, [debouncedSearch, setParams]);

  function patch(change: Partial<TicketFilterValues>) {
    const { search, ...selects } = change;
    if (search !== undefined) setSearchInput(search);
    if (Object.keys(selects).length === 0) return;
    setParams((prev) => {
      const out = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(selects)) {
        if (value) out.set(key, value);
        else out.delete(key);
      }
      out.delete("page");
      return out;
    });
  }

  function goToPage(next: number) {
    setParams((prev) => {
      const out = new URLSearchParams(prev);
      if (next > 1) out.set("page", String(next));
      else out.delete("page");
      return out;
    });
  }

  const query: ListParams = { ...filters, search: urlSearch || undefined, page };
  const tickets = useQuery({
    queryKey: ["tickets", query],
    queryFn: () => fetchTickets(query),
    placeholderData: keepPreviousData,
  });

  const hasFilters = Boolean(filters.status || filters.priority || filters.category || urlSearch);
  const items = tickets.data?.data ?? [];
  const meta = tickets.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My tickets</h1>
        <Link to="/tickets/new" className="rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover">
          New ticket
        </Link>
      </div>

      <TicketFilters value={{ ...filters, search: searchInput }} onChange={patch} />

      {tickets.isPending && <p className="text-neutral-500">Loading tickets...</p>}
      {tickets.isError && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">
          {messageFor(tickets.error)}
        </p>
      )}

      {tickets.isSuccess && items.length === 0 && (
        <div className="rounded border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="text-neutral-700">{hasFilters ? "No tickets match these filters." : "You have no tickets yet."}</p>
          <Link to="/tickets/new" className="mt-3 inline-block text-accent hover:underline">
            Create a new ticket
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-neutral-200 rounded border border-neutral-200 bg-white" aria-busy={tickets.isFetching}>
          {items.map((t) => (
            <li key={t.id}>
              <Link to={`/tickets/${t.id}`} className="block px-4 py-3 hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none">
                <p className="font-medium">{t.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                  <span>{CATEGORY_LABELS[t.category]}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={t.createdAt}>{formatDate(t.createdAt)}</time>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {meta && <Pagination meta={meta} onPage={goToPage} />}
    </div>
  );
}
