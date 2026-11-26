import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { ActivityTimeline } from "../../components/tickets/ActivityTimeline";
import { CommentThread } from "../../components/tickets/CommentThread";
import { PriorityBadge } from "../../components/tickets/PriorityBadge";
import { StatusBadge } from "../../components/tickets/StatusBadge";
import { TicketEditForm } from "../../components/tickets/TicketEditForm";
import { deleteTicket, fetchTicket, useInvalidateTicket } from "../../components/tickets/ticketApi";
import { CATEGORY_TONE } from "../../components/tickets/tones";
import { EmptyState, ErrorAlert, Skeleton, useDocumentTitle } from "../../components/ui/feedback";
import { Icon } from "../../components/ui/Icon";
import { button, PANEL } from "../../components/ui/styles";
import { ApiError } from "../../lib/api";
import { CATEGORY_LABELS } from "../../lib/enums";
import { messageFor } from "../../lib/errors";
import { formatDateTime } from "../../lib/format";
import type { TicketView } from "../../lib/types";

interface Props {
  // Admin pages render the status and priority selects here. The ticket carries
  // `permissions`, so the controls gate on `permissions.nextStatuses` and `permissions.priority`.
  adminControls?: (ticket: TicketView) => ReactNode;
  // Where "back" and a successful delete go.
  backTo?: string;
  backLabel?: string;
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-ink-2 hover:text-ink">
      <Icon name="arrowLeft" className="size-4" />
      {label}
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading ticket" className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-2/3" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-[13px] text-ink-3">{term}</dt>
      <dd className="min-w-0 text-right text-sm text-ink">{children}</dd>
    </div>
  );
}

export function TicketDetail({ adminControls, backTo = "/tickets", backLabel = "Back to my tickets" }: Props) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const invalidate = useInvalidateTicket();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Where focus goes after an inline panel closes, so keyboard users are not dropped on <body>.
  const returnFocus = useRef<"edit" | "delete" | null>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);

  const ticketQuery = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });
  useDocumentTitle(ticketQuery.data?.title ?? "Ticket");

  const remove = useMutation({
    mutationFn: () => deleteTicket(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      navigate(backTo);
    },
    onError: () => invalidate(id),
  });

  useEffect(() => {
    if (editing || confirmingDelete) return;
    if (returnFocus.current === "edit") editButton.current?.focus();
    if (returnFocus.current === "delete") deleteButton.current?.focus();
    returnFocus.current = null;
  }, [editing, confirmingDelete]);

  if (ticketQuery.isPending) return <DetailSkeleton />;

  if (ticketQuery.isError) {
    const notFound = ticketQuery.error instanceof ApiError && ticketQuery.error.status === 404;
    return (
      <div className="mx-auto max-w-lg space-y-4 pt-4">
        <h1 className="sr-only">{notFound ? "Ticket not found" : "Could not load the ticket"}</h1>
        <EmptyState
          icon={notFound ? "compass" : "alert"}
          title={notFound ? "Ticket not found" : "Could not load the ticket"}
          action={
            <Link to={backTo} className={button("secondary")}>
              {backLabel}
            </Link>
          }
        >
          {notFound ? "It may have been deleted, or the link may be wrong." : <span role="alert">{messageFor(ticketQuery.error)}</span>}
        </EmptyState>
      </div>
    );
  }

  const ticket = ticketQuery.data;
  const { permissions } = ticket;
  const canAct = (permissions.edit || permissions.delete) && !editing;

  return (
    <div className="space-y-6">
      <BackLink to={backTo} label={backLabel} />

      <header className="space-y-3">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-ink">{ticket.title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span className="basis-full sm:basis-auto sm:border-l sm:border-line sm:pl-3">
            Opened by <span className="font-medium text-ink">{ticket.createdBy.name}</span> on{" "}
            <time dateTime={ticket.createdAt}>{formatDateTime(ticket.createdAt)}</time>
          </span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          <article aria-label="Description" className="space-y-3">
            {editing ? (
              <TicketEditForm
                ticket={ticket}
                onDone={() => {
                  returnFocus.current = "edit";
                  setEditing(false);
                }}
              />
            ) : (
              <div className={`${PANEL} px-5 py-4`}>
                <p className="max-w-[72ch] text-[15px] leading-relaxed whitespace-pre-wrap text-ink">{ticket.description}</p>
              </div>
            )}

            {canAct && (
              <div className="flex flex-wrap items-center gap-2">
                {permissions.edit && (
                  <button ref={editButton} type="button" onClick={() => setEditing(true)} className={button("secondary", "sm")}>
                    <Icon name="pencil" className="size-3.5" />
                    Edit ticket
                  </button>
                )}
                {permissions.delete && !confirmingDelete && (
                  <button ref={deleteButton} type="button" onClick={() => setConfirmingDelete(true)} className={button("danger", "sm")}>
                    <Icon name="trash" className="size-3.5" />
                    Delete
                  </button>
                )}
                {permissions.delete && confirmingDelete && (
                  <div
                    role="alertdialog"
                    aria-label="Confirm delete"
                    aria-describedby="delete-warning"
                    className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 tone-red tone-soft tone-ring"
                  >
                    <span id="delete-warning" className="text-sm">
                      Delete this ticket? This cannot be undone.
                    </span>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate()}
                        className={button("dangerSolid", "sm")}
                      >
                        {remove.isPending ? "Deleting…" : "Delete ticket"}
                      </button>
                      <button
                        type="button"
                        autoFocus
                        onClick={() => {
                          returnFocus.current = "delete";
                          setConfirmingDelete(false);
                        }}
                        className={button("secondary", "sm")}
                      >
                        Keep it
                      </button>
                    </span>
                  </div>
                )}
              </div>
            )}
            {!permissions.edit && !adminControls && ticket.status !== "OPEN" && (
              <p className="text-[13px] text-ink-3">Tickets can be edited only while they are open.</p>
            )}
            {remove.isError && <ErrorAlert>{messageFor(remove.error)}</ErrorAlert>}
          </article>

          <CommentThread ticketId={ticket.id} canComment={permissions.comment} />
        </div>

        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="details-heading" className={`${PANEL} overflow-hidden px-4 pt-3 pb-1`}>
            <h2 id="details-heading" className="pb-1 text-[13px] font-semibold text-ink">
              Details
            </h2>
            <dl className="divide-y divide-line">
              <Detail term="Category">
                <span className={`inline-flex items-center gap-1.5 ${CATEGORY_TONE[ticket.category]}`}>
                  <span aria-hidden="true" className="size-1.5 rounded-full tone-fill" />
                  {CATEGORY_LABELS[ticket.category]}
                </span>
              </Detail>
              <Detail term="Requester">{ticket.createdBy.name}</Detail>
              <Detail term="Updated">
                <time dateTime={ticket.updatedAt}>{formatDateTime(ticket.updatedAt)}</time>
              </Detail>
              {ticket.resolvedAt && (
                <Detail term="Resolved">
                  <time dateTime={ticket.resolvedAt}>{formatDateTime(ticket.resolvedAt)}</time>
                </Detail>
              )}
            </dl>
            {adminControls && (
              <div className="-mx-4 mt-1 -mb-1 border-t border-line bg-surface-2/60 px-4 py-3">
                <h3 className="mb-2 text-[13px] font-semibold text-ink">Triage</h3>
                {adminControls(ticket)}
              </div>
            )}
          </section>

          <ActivityTimeline ticketId={ticket.id} />
        </aside>
      </div>
    </div>
  );
}
