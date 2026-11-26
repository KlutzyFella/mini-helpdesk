import { useMutation } from "@tanstack/react-query";
import { PRIORITY_LABELS, STATUS_LABELS } from "../../lib/enums";
import { messageFor } from "../../lib/errors";
import type { TicketPriority, TicketStatus, TicketView } from "../../lib/types";
import { PriorityBadge } from "../tickets/PriorityBadge";
import { PRIORITY_OPTIONS } from "../tickets/options";
import { StatusBadge } from "../tickets/StatusBadge";
import { adminUpdateTicket, useInvalidateTicket, type AdminPatch } from "../tickets/ticketApi";
import { PRIORITY_TONE, STATUS_TONE } from "../tickets/tones";

interface Props {
  ticket: TicketView;
  compact?: boolean;
}

// A select that wears the tone of its current value, so the row still scans like a badge.
const toneSelect = (compact: boolean) =>
  `appearance-none rounded-full bg-no-repeat font-medium tone-soft tone-ring transition-[box-shadow,opacity] duration-150 hover:shadow-[inset_0_0_0_1px_var(--tone)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-progress disabled:opacity-60 select-chevron ${
    compact ? "h-9 pr-7 pl-3 text-xs sm:h-8" : "h-10 pr-8 pl-3.5 text-sm"
  }`;

export function TicketTriage({ ticket, compact = false }: Props) {
  const invalidate = useInvalidateTicket();
  const { permissions } = ticket;

  const patch = useMutation({
    mutationFn: (body: AdminPatch) => adminUpdateTicket(ticket.id, body),
    // Success and failure both refetch; the selects are controlled by the server value,
    // so a failed change snaps back once the refetch lands.
    onSettled: () => invalidate(ticket.id),
  });

  const select = toneSelect(compact);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {permissions.nextStatuses.length === 0 ? (
        <StatusBadge status={ticket.status} />
      ) : (
        <select
          aria-label={`Status for ${ticket.title}`}
          className={`${select} ${STATUS_TONE[ticket.status]}`}
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
          className={`${select} ${PRIORITY_TONE[ticket.priority]}`}
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
        <span role="alert" className="basis-full text-[13px] text-danger">
          {messageFor(patch.error)}
        </span>
      )}
    </div>
  );
}
