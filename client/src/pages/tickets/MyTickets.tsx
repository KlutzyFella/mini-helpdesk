import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { PriorityBadge } from "../../components/tickets/PriorityBadge";
import { Pagination } from "../../components/tickets/Pagination";
import { StatusBadge } from "../../components/tickets/StatusBadge";
import { TicketFilters } from "../../components/tickets/TicketFilters";
import { fetchTickets } from "../../components/tickets/ticketApi";
import { useTicketListParams } from "../../components/tickets/useTicketListParams";
import { CATEGORY_LABELS } from "../../lib/enums";
import { messageFor } from "../../lib/errors";
import { formatDate } from "../../lib/format";

export function MyTickets() {
  const { query, filterValues, hasFilters, setFilters, goToPage } = useTicketListParams();
  const tickets = useQuery({
    queryKey: ["tickets", query],
    queryFn: () => fetchTickets(query),
    placeholderData: keepPreviousData,
  });

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

      <TicketFilters value={filterValues} onChange={setFilters} />

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
