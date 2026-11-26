import type { JsonValue } from "@prisma/client/runtime/client";
import type { Role } from "../../generated/prisma/enums.ts";
import { prisma } from "../../lib/prisma.ts";
import { findVisibleTicket } from "../tickets/tickets.service.ts";
import type { Actor } from "../tickets/tickets.types.ts";

export interface ActivityView {
  id: number;
  type: string;
  metadata: JsonValue;
  createdAt: Date;
  actor: { id: string; name: string; role: Role };
}

export async function listForTicket(actor: Actor, ticketId: string): Promise<ActivityView[]> {
  await findVisibleTicket(actor, ticketId);
  return prisma.activityLog.findMany({
    where: { ticketId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      type: true,
      metadata: true,
      createdAt: true,
      actor: { select: { id: true, name: true, role: true } },
    },
  });
}
