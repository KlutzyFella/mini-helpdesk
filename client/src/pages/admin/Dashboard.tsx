import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { CATEGORY_TONE, PRIORITY_TONE, STATUS_TONE } from "../../components/tickets/tones";
import { ErrorAlert, PageHeader, Skeleton } from "../../components/ui/feedback";
import { PANEL } from "../../components/ui/styles";
import { apiFetch } from "../../lib/api";
import { CATEGORIES, CATEGORY_LABELS, PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from "../../lib/enums";
import { messageFor } from "../../lib/errors";
import { formatHours } from "../../lib/format";
import type { TicketStats } from "../../lib/types";

const fetchStats = () => apiFetch<TicketStats>("/api/admin/stats").then((r) => r.data);

interface TileProps {
  label: string;
  value: string;
  to?: string;
  tone?: string;
  muted?: boolean;
}

function Tile({ label, value, to, tone, muted = false }: TileProps) {
  const body = (
    <>
      <span className={`flex items-center gap-2 text-[13px] text-ink-2 ${tone ?? ""}`}>
        {tone && <span aria-hidden="true" className="size-2 rounded-full tone-fill" />}
        {label}
      </span>
      <span
        className={`mt-2 block leading-none tabular ${
          muted ? "pt-2 text-sm text-ink-3" : "text-[1.75rem] font-semibold tracking-[-0.02em] text-ink"
        }`}
      >
        {value}
      </span>
    </>
  );
  return (
    <div role="group" aria-label={label} className="min-w-0 bg-surface">
      {to ? (
        <Link to={to} className="block h-full px-5 py-4 transition-colors duration-150 hover:bg-surface-2 focus-visible:-outline-offset-2">
          {body}
        </Link>
      ) : (
        <div className="px-5 py-4">{body}</div>
      )}
    </div>
  );
}

interface BarListProps<K extends string> {
  title: string;
  param: "status" | "priority" | "category";
  keys: readonly K[];
  labels: Record<K, string>;
  counts: Record<K, number>;
  tones: Record<K, string>;
}

function BarList<K extends string>({ title, param, keys, labels, counts, tones }: BarListProps<K>) {
  const max = Math.max(1, ...keys.map((k) => counts[k]));
  return (
    <section className={`${PANEL} p-5`}>
      <h2 className="mb-4 text-sm font-semibold text-ink">{title}</h2>
      <ul aria-label={title} className="space-y-1">
        {keys.map((k) => (
          <li key={k}>
            <Link
              to={`/admin/tickets?${param}=${k}`}
              className={`group -mx-2 grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-surface-2 ${tones[k]}`}
            >
              <span className="truncate text-ink-2 group-hover:text-ink">{labels[k]}</span>
              <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full tone-fill transition-[width] duration-500 ease-out"
                  style={{ width: `${(counts[k] / max) * 100}%` }}
                />
              </span>
              <span className="text-right font-medium text-ink tabular">{counts[k]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading stats" className="space-y-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const stats = useQuery({ queryKey: ["stats"], queryFn: fetchStats });
  const s = stats.data;

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Where the queue stands right now. Select any row to see those tickets." />

      {stats.isPending && <DashboardSkeleton />}
      {stats.isError && <ErrorAlert>{messageFor(stats.error)}</ErrorAlert>}

      {s && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
            <Tile label="Total tickets" value={String(s.total)} to="/admin/tickets" />
            <Tile label="Open" value={String(s.byStatus.OPEN)} to="/admin/tickets?status=OPEN" tone={STATUS_TONE.OPEN} />
            <Tile
              label="In progress"
              value={String(s.byStatus.IN_PROGRESS)}
              to="/admin/tickets?status=IN_PROGRESS"
              tone={STATUS_TONE.IN_PROGRESS}
            />
            <Tile
              label="Avg. time to resolve"
              value={s.avgResolutionHours === null ? "No tickets resolved yet" : formatHours(s.avgResolutionHours)}
              muted={s.avgResolutionHours === null}
            />
          </div>

          <BarList title="Tickets by status" param="status" keys={STATUSES} labels={STATUS_LABELS} counts={s.byStatus} tones={STATUS_TONE} />
          <div className="grid gap-6 md:grid-cols-2">
            <BarList
              title="Tickets by priority"
              param="priority"
              keys={PRIORITIES}
              labels={PRIORITY_LABELS}
              counts={s.byPriority}
              tones={PRIORITY_TONE}
            />
            <BarList
              title="Tickets by category"
              param="category"
              keys={CATEGORIES}
              labels={CATEGORY_LABELS}
              counts={s.byCategory}
              tones={CATEGORY_TONE}
            />
          </div>
        </div>
      )}
    </div>
  );
}
