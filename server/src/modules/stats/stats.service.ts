import { TicketCategory, TicketPriority, TicketStatus } from "../../generated/prisma/enums.ts";
import { prisma } from "../../lib/prisma.ts";

export interface Stats {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  byCategory: Record<TicketCategory, number>;
  avgResolutionHours: number | null;
}

function tally<K extends string>(keys: Record<K, K>, rows: Array<{ key: K; count: number }>): Record<K, number> {
  const zeroes = Object.fromEntries(Object.values<K>(keys).map((k) => [k, 0])) as Record<K, number>;
  return { ...zeroes, ...Object.fromEntries(rows.map((r) => [r.key, r.count])) };
}

export async function get(): Promise<Stats> {
  const [status, priority, category, [avg]] = await prisma.$transaction(
    [
      prisma.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ["priority"], _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ["category"], _count: { _all: true } }),
      prisma.$queryRaw<[{ hours: number | null }]>`
        SELECT ROUND((AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))) / 3600)::numeric, 2)::float8 AS hours
        FROM tickets
        WHERE "resolvedAt" IS NOT NULL`,
    ],
    { isolationLevel: "RepeatableRead" },
  );

  const byStatus = tally(TicketStatus, status.map((r) => ({ key: r.status, count: r._count._all })));
  return {
    total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
    byStatus,
    byPriority: tally(TicketPriority, priority.map((r) => ({ key: r.priority, count: r._count._all }))),
    byCategory: tally(TicketCategory, category.map((r) => ({ key: r.category, count: r._count._all }))),
    avgResolutionHours: avg.hours,
  };
}
