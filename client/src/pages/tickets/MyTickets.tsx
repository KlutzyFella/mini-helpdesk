import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { PriorityBadge } from "../../components/tickets/PriorityBadge";
import { StatusBadge } from "../../components/tickets/StatusBadge";
import { NO_FILTERS, TicketFilters } from "../../components/tickets/TicketFilters";
import { TicketListFrame } from "../../components/tickets/TicketListFrame";
import { fetchTickets } from "../../components/tickets/ticketApi";
import { useTicketListParams } from "../../components/tickets/useTicketListParams";
import { PageHeader } from "../../components/ui/feedback";
import { Icon } from "../../components/ui/Icon";
import { button } from "../../components/ui/styles";
import { CATEGORY_LABELS } from "../../lib/enums";
import { formatDate } from "../../lib/format";

const COLUMNS = "sm:grid sm:grid-cols-[minmax(0,1fr)_8rem_6.5rem_6.5rem] sm:items-center sm:gap-4";

export function MyTickets() {
  const { query, filterValues, hasFilters, setFilters, goToPage } = useTicketListParams();
  const tickets = useQuery({
    queryKey: ["tickets", query],
    queryFn: () => fetchTickets(query),
    placeholderData: keepPreviousData,
  });

  const newTicket = (
    <Link to="/tickets/new" className={button("primary")}>
      <Icon name="plus" className="size-4" />
      New ticket
    </Link>
  );

  return (
    <div className="space-y-8">
      <PageHeader title="My tickets" description="Everything you have raised with support." actions={newTicket} />

      <TicketFilters value={filterValues} onChange={setFilters} />

      <TicketListFrame
        tickets={tickets}
        hasFilters={hasFilters}
        onClearFilters={() => setFilters(NO_FILTERS)}
        onPage={goToPage}
        empty={{
          title: "You have no tickets yet",
          body: "When something goes wrong, raise a ticket and follow it here until it is resolved.",
          action: newTicket,
        }}
      >
        {(items) => (
          <>
            <div
              aria-hidden="true"
              className={`hidden border-b border-line bg-surface-2/60 px-4 py-2 text-xs font-medium text-ink-3 ${COLUMNS}`}
            >
              <span>Ticket</span>
              <span>Status</span>
              <span>Priority</span>
              <span className="text-right">Created</span>
            </div>
            <ul className="divide-y divide-line">
              {items.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/tickets/${t.id}`}
                    className={`group block px-4 py-3.5 transition-colors duration-150 hover:bg-surface-2 focus-visible:-outline-offset-2 ${COLUMNS}`}
                  >
                    <span className="block min-w-0">
                      <span className="block truncate font-medium text-ink group-hover:text-accent-ink">{t.title}</span>
                      <span className="mt-0.5 block text-[13px] text-ink-3">{CATEGORY_LABELS[t.category]}</span>
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 sm:contents">
                      <span>
                        <StatusBadge status={t.status} />
                      </span>
                      <span>
                        <PriorityBadge priority={t.priority} />
                      </span>
                      <time dateTime={t.createdAt} className="text-[13px] text-ink-3 sm:text-right">
                        {formatDate(t.createdAt)}
                      </time>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </TicketListFrame>
    </div>
  );
}
