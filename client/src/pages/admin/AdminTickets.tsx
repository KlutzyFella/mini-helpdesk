import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { TicketTriage } from "../../components/admin/TicketTriage";
import { SelectField } from "../../components/tickets/fields";
import { Pagination } from "../../components/tickets/Pagination";
import { TicketFilters } from "../../components/tickets/TicketFilters";
import { fetchTickets } from "../../components/tickets/ticketApi";
import { useTicketListParams, type SortKey, type SortOrder } from "../../components/tickets/useTicketListParams";
import { CATEGORY_LABELS } from "../../lib/enums";
import { messageFor } from "../../lib/errors";
import { formatDate } from "../../lib/format";

const SORT_OPTIONS = [
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Last updated" },
  { value: "priority", label: "Priority" },
];
const ORDER_OPTIONS = [
  { value: "desc", label: "Descending" },
  { value: "asc", label: "Ascending" },
];

export function AdminTickets() {
  const { query, filterValues, hasFilters, setFilters, setSorting, goToPage } = useTicketListParams();
  const tickets = useQuery({
    queryKey: ["tickets", query],
    queryFn: () => fetchTickets(query),
    placeholderData: keepPreviousData,
  });

  const items = tickets.data?.data ?? [];
  const meta = tickets.data?.meta;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">All tickets</h1>

      <TicketFilters value={filterValues} onChange={setFilters} />
      <div className="grid gap-3 sm:grid-cols-4">
        <SelectField label="Sort by" name="sort" value={query.sort ?? "createdAt"} options={SORT_OPTIONS} onChange={(e) => setSorting({ sort: e.target.value as SortKey })} />
        <SelectField label="Order" name="order" value={query.order ?? "desc"} options={ORDER_OPTIONS} onChange={(e) => setSorting({ order: e.target.value as SortOrder })} />
      </div>

      {tickets.isPending && <p className="text-neutral-500">Loading tickets...</p>}
      {tickets.isError && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">
          {messageFor(tickets.error)}
        </p>
      )}

      {tickets.isSuccess && items.length === 0 && (
        <div className="rounded border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="text-neutral-700">{hasFilters ? "No tickets match these filters." : "There are no tickets yet."}</p>
        </div>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-neutral-200 rounded border border-neutral-200 bg-white" aria-busy={tickets.isFetching}>
          {items.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Link to={`/admin/tickets/${t.id}`} className="font-medium text-accent hover:underline">
                  {t.title}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
                  <span>{t.createdBy.name}</span>
                  <span aria-hidden="true">·</span>
                  <span>{CATEGORY_LABELS[t.category]}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={t.createdAt}>{formatDate(t.createdAt)}</time>
                </p>
              </div>
              <TicketTriage ticket={t} compact />
            </li>
          ))}
        </ul>
      )}

      {meta && <Pagination meta={meta} onPage={goToPage} />}
    </div>
  );
}
