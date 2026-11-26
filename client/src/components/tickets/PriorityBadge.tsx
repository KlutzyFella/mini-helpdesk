import { PRIORITY_LABELS } from "../../lib/enums";
import type { TicketPriority } from "../../lib/types";

const STYLES: Record<TicketPriority, string> = {
  LOW: "bg-neutral-100 text-neutral-700 ring-neutral-300",
  MEDIUM: "bg-sky-50 text-sky-800 ring-sky-200",
  HIGH: "bg-orange-50 text-orange-800 ring-orange-200",
  URGENT: "bg-red-50 text-red-800 ring-red-200",
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
