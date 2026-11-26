import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { CATEGORIES, PRIORITIES, STATUSES } from "../../lib/enums";
import type { TicketFilterValues } from "./TicketFilters";
import type { ListParams } from "./ticketApi";

const SEARCH_DEBOUNCE_MS = 300;
const SORTS = ["createdAt", "updatedAt", "priority"] as const;
const ORDERS = ["asc", "desc"] as const;

export type SortKey = (typeof SORTS)[number];
export type SortOrder = (typeof ORDERS)[number];

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

function withParams(prev: URLSearchParams, changes: Record<string, string>, resetPage: boolean): URLSearchParams {
  const out = new URLSearchParams(prev);
  for (const [key, value] of Object.entries(changes)) {
    if (value) out.set(key, value);
    else out.delete(key);
  }
  if (resetPage) out.delete("page");
  return out;
}

export function useTicketListParams() {
  const [params, setParams] = useSearchParams();
  const urlSearch = params.get("search") ?? "";
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const filters = {
    status: oneOf(STATUSES, params.get("status")),
    priority: oneOf(PRIORITIES, params.get("priority")),
    category: oneOf(CATEGORIES, params.get("category")),
  };
  const sort = oneOf(SORTS, params.get("sort")) || undefined;
  const order = oneOf(ORDERS, params.get("order")) || undefined;

  // setParams(prev => ...) hands over the params of the last render, so a second change made
  // before React re-renders would drop the first. Build every change on the latest URL instead.
  const latest = useRef(params);
  useLayoutEffect(() => {
    latest.current = params;
  }, [params]);

  const update = useCallback(
    (changes: Record<string, string>, resetPage: boolean, replace = false) => {
      const next = withParams(latest.current, changes, resetPage);
      latest.current = next;
      setParams(next, { replace });
    },
    [setParams],
  );

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

  // update changes identity on every URL change, so this effect re-runs then too.
  // Navigating only when the search changed keeps it from writing back a stale URL.
  useEffect(() => {
    if (debouncedSearch === pushedSearch.current) return;
    pushedSearch.current = debouncedSearch;
    update({ search: debouncedSearch }, true, true);
  }, [debouncedSearch, update]);

  function setFilters(change: Partial<TicketFilterValues>) {
    const { search, ...selects } = change;
    if (search !== undefined) setSearchInput(search);
    if (Object.keys(selects).length > 0) update(selects as Record<string, string>, true);
  }

  function setSorting(change: { sort?: SortKey; order?: SortOrder }) {
    update(change as Record<string, string>, true);
  }

  function goToPage(next: number) {
    update({ page: next > 1 ? String(next) : "" }, false);
  }

  const query: ListParams = { ...filters, search: urlSearch || undefined, sort, order, page };
  const hasFilters = Boolean(filters.status || filters.priority || filters.category || urlSearch);

  return { query, filterValues: { ...filters, search: searchInput }, hasFilters, setFilters, setSorting, goToPage };
}
