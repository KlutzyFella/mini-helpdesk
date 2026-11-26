import { useMutation } from "@tanstack/react-query";
import { PRIORITY_LABELS, STATUS_LABELS } from "../../lib/enums";
import { messageFor } from "../../lib/errors";
import type { TicketPriority, TicketStatus, TicketView } from "../../lib/types";
import { PriorityBadge } from "../tickets/PriorityBadge";
import { PRIORITY_OPTIONS } from "../tickets/options";
import { StatusBadge } from "../tickets/StatusBadge";
import { adminUpdateTicket, useInvalidateTicket, type AdminPatch } from "../tickets/ticketApi";

interface Props {
  ticket: TicketView;
  compact?: boolean;
}

export function TicketTriage({ ticket, compact = false }: Props) {
  const invalidate = useInvalidateTicket();
  const { permissions } = ticket;

  const patch = useMutation({
    mutationFn: (body: AdminPatch) => adminUpdateTicket(ticket.id, body),
    // Success and failure both refetch; the selects are controlled by the server value,
    // so a failed change snaps back once the refetch lands.
    onSettled: () => invalidate(ticket.id),
  });

  const size = compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm";
  const select = `rounded border border-neutral-300 bg-white ${size} disabled:opacity-60`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {permissions.nextStatuses.length === 0 ? (
        <StatusBadge status={ticket.status} />
      ) : (
        <select
          aria-label={`Status for ${ticket.title}`}
          className={select}
          value={ticket.status}
          disabled={patch.isPending}
          onChange={(e) => patch.mutate({ status: e.target.value as TicketStatus })}
        >
          <option value={ticket.status} disabled>
            {STATUS_LABELS[ticket.status]}
          </option>
          {permissions.nextStatuses.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      )}
      {permissions.priority ? (
        <select
          aria-label={`Priority for ${ticket.title}`}
          className={select}
          value={ticket.priority}
          disabled={patch.isPending}
          onChange={(e) => patch.mutate({ priority: e.target.value as TicketPriority })}
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {PRIORITY_LABELS[o.value as TicketPriority]}
            </option>
          ))}
        </select>
      ) : (
        <PriorityBadge priority={ticket.priority} />
      )}
      {patch.isError && (
        <span role="alert" className="text-sm text-red-700">
          {messageFor(patch.error)}
        </span>
      )}
    </div>
  );
}
