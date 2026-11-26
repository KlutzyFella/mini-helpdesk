import { STATUS_LABELS } from "../../lib/enums";
import type { TicketStatus } from "../../lib/types";

const STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-50 text-blue-800 ring-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-800 ring-amber-200",
  RESOLVED: "bg-green-50 text-green-800 ring-green-200",
  CLOSED: "bg-neutral-100 text-neutral-700 ring-neutral-300",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
