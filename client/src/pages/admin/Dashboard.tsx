import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
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
}

function Tile({ label, value, to }: TileProps) {
  const body = (
    <>
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </>
  );
  return (
    <div role="group" aria-label={label} className="rounded border border-neutral-200 bg-white">
      {to ? (
        <Link to={to} className="block px-4 py-3 hover:bg-neutral-50">
          {body}
        </Link>
      ) : (
        <div className="px-4 py-3">{body}</div>
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
}

function BarList<K extends string>({ title, param, keys, labels, counts }: BarListProps<K>) {
  const max = Math.max(1, ...keys.map((k) => counts[k]));
  return (
    <section className="rounded border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 font-medium">{title}</h2>
      <ul aria-label={title} className="space-y-2">
        {keys.map((k) => (
          <li key={k} className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-sm">
            <Link to={`/admin/tickets?${param}=${k}`} className="text-accent hover:underline">
              {labels[k]}
            </Link>
            <div aria-hidden="true" className="h-3 rounded bg-neutral-100">
              <div className="h-3 rounded bg-accent" style={{ width: `${(counts[k] / max) * 100}%` }} />
            </div>
            <span className="text-right tabular-nums">{counts[k]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Dashboard() {
  const stats = useQuery({ queryKey: ["stats"], queryFn: fetchStats });
  const s = stats.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {stats.isPending && <p className="text-neutral-500">Loading stats...</p>}
      {stats.isError && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">
          {messageFor(stats.error)}
        </p>
      )}

      {s && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Total tickets" value={String(s.total)} to="/admin/tickets" />
            <Tile label="Open" value={String(s.byStatus.OPEN)} to="/admin/tickets?status=OPEN" />
            <Tile label="In progress" value={String(s.byStatus.IN_PROGRESS)} to="/admin/tickets?status=IN_PROGRESS" />
            <Tile
              label="Avg. time to resolve"
              value={s.avgResolutionHours === null ? "No tickets resolved yet" : formatHours(s.avgResolutionHours)}
            />
          </div>

          <BarList title="Tickets by status" param="status" keys={STATUSES} labels={STATUS_LABELS} counts={s.byStatus} />
          <div className="grid gap-6 md:grid-cols-2">
            <BarList title="Tickets by priority" param="priority" keys={PRIORITIES} labels={PRIORITY_LABELS} counts={s.byPriority} />
            <BarList title="Tickets by category" param="category" keys={CATEGORIES} labels={CATEGORY_LABELS} counts={s.byCategory} />
          </div>
        </>
      )}
    </div>
  );
}
