import { STATUS_LABELS } from "../../lib/enums";
import type { TicketStatus } from "../../lib/types";
import { STATUS_TONE } from "./tones";

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap tone-soft tone-ring ${STATUS_TONE[status]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full tone-fill" />
      {STATUS_LABELS[status]}
    </span>
  );
}
