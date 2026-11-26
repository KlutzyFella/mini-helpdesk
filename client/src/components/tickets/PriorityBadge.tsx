import { PRIORITY_LABELS } from "../../lib/enums";
import type { TicketPriority } from "../../lib/types";
import { PRIORITY_LEVEL, PRIORITY_TONE } from "./tones";

// Signal bars give priority a shape as well as a colour, so it scans without relying on hue.
export function PriorityBars({ priority }: { priority: TicketPriority }) {
  const level = PRIORITY_LEVEL[priority];
  return (
    <svg aria-hidden="true" viewBox="0 0 14 12" className={`h-3 w-3.5 shrink-0 ${PRIORITY_TONE[priority]}`}>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 3.67}
          y={9 - i * 3}
          width="2.5"
          height={3 + i * 3}
          rx="0.75"
          fill={i < level ? "var(--tone)" : "var(--line-strong)"}
        />
      ))}
    </svg>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 text-xs font-medium whitespace-nowrap tone-text ${PRIORITY_TONE[priority]}`}>
      <PriorityBars priority={priority} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
