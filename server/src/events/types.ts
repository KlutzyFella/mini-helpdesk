import type { TicketPriority, TicketStatus } from "../generated/prisma/enums.ts";

interface EventBase {
  ticketId: string;
  actorId: string;
}

export interface TicketChanges {
  title?: string;
  description?: string;
  category?: string;
  priority?: TicketPriority;
}

export type DomainEvent =
  | (EventBase & { type: "TICKET_CREATED" })
  | (EventBase & { type: "TICKET_UPDATED"; changes: TicketChanges })
  | (EventBase & { type: "STATUS_CHANGED"; from: TicketStatus; to: TicketStatus })
  | (EventBase & { type: "TICKET_RESOLVED"; from: TicketStatus; to: TicketStatus })
  | (EventBase & { type: "COMMENT_ADDED"; commentId: string });

export function assertNever(value: never): never {
  throw new Error(`Unhandled event: ${JSON.stringify(value)}`);
}
