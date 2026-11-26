import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { ActivityTimeline } from "../../components/tickets/ActivityTimeline";
import { CommentThread } from "../../components/tickets/CommentThread";
import { PriorityBadge } from "../../components/tickets/PriorityBadge";
import { StatusBadge } from "../../components/tickets/StatusBadge";
import { TicketEditForm } from "../../components/tickets/TicketEditForm";
import { deleteTicket, fetchTicket, useInvalidateTicket } from "../../components/tickets/ticketApi";
import { ApiError } from "../../lib/api";
import { CATEGORY_LABELS } from "../../lib/enums";
import { messageFor } from "../../lib/errors";
import { formatDateTime } from "../../lib/format";
import type { TicketView } from "../../lib/types";

interface Props {
  // PR9 extension point: render the status and priority selects here. The ticket carries
  // `permissions`, so the controls gate on `permissions.nextStatuses` and `permissions.priority`.
  adminControls?: (ticket: TicketView) => ReactNode;
  // Where "back" and a successful delete go. PR9 passes "/admin/tickets".
  backTo?: string;
  backLabel?: string;
}

export function TicketDetail({ adminControls, backTo = "/tickets", backLabel = "Back to my tickets" }: Props) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const invalidate = useInvalidateTicket();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const ticketQuery = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });

  const remove = useMutation({
    mutationFn: () => deleteTicket(id),
    onSuccess: async () => {
      // Skip refetching the deleted ticket: drop its caches, refresh the list, then leave.
      await invalidate(id).catch(() => undefined);
      navigate(backTo);
    },
    onError: () => invalidate(id),
  });

  if (ticketQuery.isPending) return <p className="text-neutral-500">Loading ticket...</p>;

  if (ticketQuery.isError) {
    const notFound = ticketQuery.error instanceof ApiError && ticketQuery.error.status === 404;
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">{notFound ? "Ticket not found" : "Could not load the ticket"}</h1>
        {!notFound && <p role="alert">{messageFor(ticketQuery.error)}</p>}
        <Link to={backTo} className="text-accent hover:underline">
          {backLabel}
        </Link>
      </div>
    );
  }

  const ticket = ticketQuery.data;
  const { permissions } = ticket;

  return (
    <div className="space-y-8">
      <Link to={backTo} className="text-sm text-accent hover:underline">
        {backLabel}
      </Link>

      <article className="space-y-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">{ticket.title}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span>{CATEGORY_LABELS[ticket.category]}</span>
          </p>
          <p className="text-sm text-neutral-500">
            Created by {ticket.createdBy.name} on <time dateTime={ticket.createdAt}>{formatDateTime(ticket.createdAt)}</time>
            {" · "}Updated <time dateTime={ticket.updatedAt}>{formatDateTime(ticket.updatedAt)}</time>
          </p>
        </header>

        {editing ? (
          <TicketEditForm ticket={ticket} onDone={() => setEditing(false)} />
        ) : (
          <p className="whitespace-pre-wrap rounded border border-neutral-200 bg-white p-4 text-sm">{ticket.description}</p>
        )}

        {adminControls?.(ticket)}

        {(permissions.edit || permissions.delete) && !editing && (
          <div className="flex flex-wrap items-center gap-2">
            {permissions.edit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-100"
              >
                Edit
              </button>
            )}
            {permissions.delete && !confirmingDelete && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            )}
            {permissions.delete && confirmingDelete && (
              <div role="alertdialog" aria-label="Confirm delete" className="flex flex-wrap items-center gap-2 rounded bg-red-50 px-3 py-2 text-sm">
                <span>Delete this ticket? This cannot be undone.</span>
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                  className="rounded bg-red-700 px-3 py-1 text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {remove.isPending ? "Deleting..." : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded border border-neutral-300 bg-white px-3 py-1 hover:bg-neutral-100"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
        {remove.isError && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">
            {messageFor(remove.error)}
          </p>
        )}
      </article>

      <CommentThread ticketId={ticket.id} canComment={permissions.comment} />
      <ActivityTimeline ticketId={ticket.id} />
    </div>
  );
}
