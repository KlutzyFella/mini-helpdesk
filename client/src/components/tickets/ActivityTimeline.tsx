import { useQuery } from "@tanstack/react-query";
import { messageFor } from "../../lib/errors";
import { activityLabel, formatDateTime } from "../../lib/format";
import type { ActivityType } from "../../lib/types";
import { ErrorAlert, Skeleton } from "../ui/feedback";
import { fetchActivity } from "./ticketApi";

const DOT: Record<ActivityType, string> = {
  TICKET_CREATED: "tone-blue",
  TICKET_UPDATED: "tone-gray",
  STATUS_CHANGED: "tone-amber",
  TICKET_RESOLVED: "tone-green",
  COMMENT_ADDED: "tone-violet",
};

export function ActivityTimeline({ ticketId }: { ticketId: string }) {
  const activity = useQuery({ queryKey: ["activity", ticketId], queryFn: () => fetchActivity(ticketId) });
  const items = activity.data ?? [];
  return (
    <section aria-labelledby="activity-heading" className="space-y-3">
      <h2 id="activity-heading" className="text-[13px] font-semibold text-ink">
        Activity
      </h2>
      {activity.isPending && (
        <div role="status" aria-label="Loading activity" className="space-y-3">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      )}
      {activity.isError && <ErrorAlert>{messageFor(activity.error)}</ErrorAlert>}
      {activity.isSuccess && items.length === 0 && <p className="text-sm text-ink-3">No activity recorded yet.</p>}
      {items.length > 0 && (
        <ol className="relative">
          {items.map((a, i) => (
            <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < items.length - 1 && (
                <span aria-hidden="true" className="absolute top-3 bottom-0 left-[3.5px] w-px bg-line-strong" />
              )}
              <span aria-hidden="true" className={`relative mt-1.5 size-2 shrink-0 rounded-full ring-4 ring-canvas tone-fill ${DOT[a.type]}`} />
              <span className="min-w-0 text-sm">
                <span className="block text-ink">{activityLabel(a)}</span>
                <time dateTime={a.createdAt} className="block text-xs text-ink-3">
                  {formatDateTime(a.createdAt)}
                </time>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
