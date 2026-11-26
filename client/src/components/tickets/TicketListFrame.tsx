import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { messageFor } from "../../lib/errors";
import type { ApiResult } from "../../lib/api";
import type { ListMeta, TicketView } from "../../lib/types";
import { EmptyState, ErrorAlert, LoadingRows } from "../ui/feedback";
import { button } from "../ui/styles";
import { Pagination } from "./Pagination";


interface Props {
  tickets: UseQueryResult<ApiResult<TicketView[], ListMeta>>;
  hasFilters: boolean;
  onClearFilters: () => void;
  onPage: (page: number) => void;
  empty: { title: string; body: string; action?: ReactNode };
  toolbar?: ReactNode;
  children: (items: TicketView[]) => ReactNode;
}

// Owns the loading, error, empty and paginated states every ticket list shares.
export function TicketListFrame({ tickets, hasFilters, onClearFilters, onPage, empty, toolbar, children }: Props) {
  const items = tickets.data?.data ?? [];
  const meta = tickets.data?.meta ?? undefined;

  return (
    <section aria-label="Tickets" className="space-y-3">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2 tabular" aria-live="polite">
          {meta ? (
            <>
              <span className="font-medium text-ink">{meta.total}</span> {meta.total === 1 ? "ticket" : "tickets"}
              {hasFilters && " match"}
            </>
          ) : (
            " "
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {hasFilters && (
            <button type="button" onClick={onClearFilters} className={button("ghost", "sm")}>
              Clear filters
            </button>
          )}
          {toolbar}
        </div>
      </div>

      {tickets.isPending && <LoadingRows label="Loading tickets" />}
      {tickets.isError && <ErrorAlert>{messageFor(tickets.error)}</ErrorAlert>}

      {tickets.isSuccess && items.length === 0 &&
        (hasFilters ? (
          <EmptyState
            icon="search"
            title="No tickets match these filters"
            action={
              <button type="button" onClick={onClearFilters} className={button("secondary", "sm")}>
                Clear filters
              </button>
            }
          >
            Try a different status, priority or search term.
          </EmptyState>
        ) : (
          <EmptyState icon="inbox" title={empty.title} action={empty.action}>
            {empty.body}
          </EmptyState>
        ))}

      {items.length > 0 && (
        <div
          aria-busy={tickets.isFetching}
          className={`overflow-hidden rounded-xl border border-line bg-surface transition-opacity duration-150 ${
            tickets.isPlaceholderData ? "opacity-60" : ""
          }`}
        >
          {children(items)}
        </div>
      )}

      {meta && <Pagination meta={meta} onPage={onPage} />}
    </section>
  );
}
