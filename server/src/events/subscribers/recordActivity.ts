import type { Prisma } from "../../generated/prisma/client.ts";
import { prisma } from "../../lib/prisma.ts";
import { assertNever, type DomainEvent } from "../types.ts";

function metadataFor(e: DomainEvent): Prisma.InputJsonObject | undefined {
  switch (e.type) {
    case "TICKET_CREATED":
      return undefined;
    case "TICKET_UPDATED":
      return { changes: { ...e.changes } };
    case "STATUS_CHANGED":
    case "TICKET_RESOLVED":
      return { from: e.from, to: e.to };
    case "COMMENT_ADDED":
      return { commentId: e.commentId };
    default:
      return assertNever(e);
  }
}

export async function recordActivity(e: DomainEvent): Promise<void> {
  await prisma.activityLog.create({
    data: { ticketId: e.ticketId, actorId: e.actorId, type: e.type, metadata: metadataFor(e) },
  });
}
