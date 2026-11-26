import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { TicketTriage } from "../../components/admin/TicketTriage";
import { NO_FILTERS, TicketFilters } from "../../components/tickets/TicketFilters";
import { TicketListFrame } from "../../components/tickets/TicketListFrame";
import { fetchTickets } from "../../components/tickets/ticketApi";
import { CATEGORY_TONE } from "../../components/tickets/tones";
import { useTicketListParams, type SortKey, type SortOrder } from "../../components/tickets/useTicketListParams";
import { PageHeader } from "../../components/ui/feedback";
import { SELECT } from "../../components/ui/styles";
import { CATEGORY_LABELS } from "../../lib/enums";
import { formatDate } from "../../lib/format";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Last updated" },
  { value: "priority", label: "Priority" },
];

// Order labels say what the user sees, which depends on the sort key.
const ORDER_LABELS: Record<SortKey, Record<SortOrder, string>> = {
  createdAt: { desc: "Newest first", asc: "Oldest first" },
  updatedAt: { desc: "Most recent first", asc: "Least recent first" },
  priority: { desc: "Highest first", asc: "Lowest first" },
};

const COMPACT_SELECT = `${SELECT} h-9 w-auto text-[13px] sm:h-8`;

export function AdminTickets() {
  const { query, filterValues, hasFilters, setFilters, setSorting, goToPage } = useTicketListParams();
  const tickets = useQuery({
    queryKey: ["tickets", query],
    queryFn: () => fetchTickets(query),
    placeholderData: keepPreviousData,
  });

  const sort: SortKey = (query.sort as SortKey | undefined) ?? "createdAt";
  const order: SortOrder = (query.order as SortOrder | undefined) ?? "desc";

  const sortControls = (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="sr-only text-[13px] text-ink-2 sm:not-sr-only sm:whitespace-nowrap">
        Sort by
      </label>
      <select id="sort" name="sort" value={sort} onChange={(e) => setSorting({ sort: e.target.value as SortKey })} className={COMPACT_SELECT}>
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <label htmlFor="order" className="sr-only">
        Order
      </label>
      <select id="order" name="order" value={order} onChange={(e) => setSorting({ order: e.target.value as SortOrder })} className={COMPACT_SELECT}>
        <option value="desc">{ORDER_LABELS[sort].desc}</option>
        <option value="asc">{ORDER_LABELS[sort].asc}</option>
      </select>
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader title="All tickets" description="Triage status and priority straight from the list." />

      <TicketFilters value={filterValues} onChange={setFilters} />

      <TicketListFrame
        tickets={tickets}
        hasFilters={hasFilters}
        onClearFilters={() => setFilters(NO_FILTERS)}
        onPage={goToPage}
        toolbar={sortControls}
        empty={{ title: "There are no tickets yet", body: "New tickets from requesters will land here." }}
      >
        {(items) => (
          <ul className="divide-y divide-line">
            {items.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-2/60 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="min-w-0">
                  <Link to={`/admin/tickets/${t.id}`} className="block truncate font-medium text-ink hover:text-accent-ink hover:underline">
                    {t.title}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3">
                    <span className="text-ink-2">{t.createdBy.name}</span>
                    <span aria-hidden="true">·</span>
                    <span className={`inline-flex items-center gap-1.5 ${CATEGORY_TONE[t.category]}`}>
                      <span aria-hidden="true" className="size-1.5 rounded-full tone-fill" />
                      {CATEGORY_LABELS[t.category]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={t.createdAt}>{formatDate(t.createdAt)}</time>
                  </p>
                </div>
                <div className="shrink-0">
                  <TicketTriage ticket={t} compact />
                </div>
              </li>
            ))}
          </ul>
        )}
      </TicketListFrame>
    </div>
  );
}
