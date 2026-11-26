import { useQuery } from "@tanstack/react-query";
import { messageFor } from "../../lib/errors";
import { activityLabel, formatDateTime } from "../../lib/format";
import { fetchActivity } from "./ticketApi";

export function ActivityTimeline({ ticketId }: { ticketId: string }) {
  const activity = useQuery({ queryKey: ["activity", ticketId], queryFn: () => fetchActivity(ticketId) });
  return (
    <section aria-labelledby="activity-heading" className="space-y-3">
      <h2 id="activity-heading" className="text-lg font-semibold">
        Activity
      </h2>
      {activity.isPending && <p className="text-sm text-neutral-500">Loading activity...</p>}
      {activity.isError && (
        <p role="alert" className="text-sm text-red-700">
          {messageFor(activity.error)}
        </p>
      )}
      <ol className="space-y-2 border-l border-neutral-300 pl-4">
        {activity.data?.map((a) => (
          <li key={a.id} className="text-sm">
            <span>{activityLabel(a)}</span>{" "}
            <time dateTime={a.createdAt} className="text-neutral-500">
              {formatDateTime(a.createdAt)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
