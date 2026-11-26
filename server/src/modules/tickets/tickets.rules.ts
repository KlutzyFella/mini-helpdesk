import type { ErrorCode } from "../../lib/errors.ts";
import type { DomainEvent, TicketChanges } from "../../events/types.ts";
import type { TicketPriority, TicketStatus } from "../../generated/prisma/enums.ts";
import type { AdminPatchBody } from "./tickets.schemas.ts";
import type { Actor, Permissions, TicketRow, TicketState } from "./tickets.types.ts";

export const TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["RESOLVED", "OPEN"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

export interface Denial {
  code: ErrorCode;
  message: string;
}

const ownsOpenTicket = (actor: Actor, t: TicketState) =>
  actor.role === "USER" && t.createdById === actor.id && t.status === "OPEN";

export const canEditContent = ownsOpenTicket;
export const canDelete = ownsOpenTicket;
export const canSetPriority = (actor: Actor, t: TicketState) => actor.role === "ADMIN" && t.status !== "CLOSED";
export const canComment = (t: TicketState) => t.status !== "CLOSED";
export const nextStatuses = (actor: Actor, t: TicketState): readonly TicketStatus[] =>
  actor.role === "ADMIN" ? TRANSITIONS[t.status] : [];

function asOwner(t: TicketState): Actor {
  return { id: t.createdById, role: "USER" };
}

const locked = (what: string): Denial => ({
  code: "TICKET_LOCKED",
  message: `Only an OPEN ticket can be ${what}`,
});

export function checkOwnerEdit(t: TicketState): Denial | null {
  return canEditContent(asOwner(t), t) ? null : locked("edited");
}

export function checkDelete(t: TicketState): Denial | null {
  return canDelete(asOwner(t), t) ? null : locked("deleted");
}

export function checkAdminPatch(t: TicketState, patch: AdminPatchBody): Denial | null {
  if (t.status === "CLOSED") return { code: "TICKET_CLOSED", message: "A closed ticket cannot be changed" };
  if (patch.status !== undefined && !TRANSITIONS[t.status].includes(patch.status)) {
    return { code: "INVALID_TRANSITION", message: `Cannot move a ${t.status} ticket to ${patch.status}` };
  }
  return null;
}

export function permissionsFor(actor: Actor, t: TicketState): Permissions {
  return {
    edit: canEditContent(actor, t),
    priority: canSetPriority(actor, t),
    delete: canDelete(actor, t),
    comment: canComment(t),
    nextStatuses: nextStatuses(actor, t),
  };
}

export function nextResolvedAt(to: TicketStatus, current: Date | null, now: Date): Date | null {
  if (to === "RESOLVED") return now;
  if (to === "CLOSED") return current;
  return null;
}

type Snapshot = Pick<TicketRow, "id" | "status" | "title" | "description" | "category" | "priority">;

function contentChanges(before: Snapshot, after: Snapshot): TicketChanges {
  const changes: TicketChanges = {};
  if (before.title !== after.title) changes.title = after.title;
  if (before.description !== after.description) changes.description = after.description;
  if (before.category !== after.category) changes.category = after.category;
  if (before.priority !== after.priority) changes.priority = after.priority as TicketPriority;
  return changes;
}

export function eventsForUpdate(before: Snapshot, after: Snapshot, actorId: string): DomainEvent[] {
  const base = { ticketId: after.id, actorId };
  const events: DomainEvent[] = [];
  if (before.status !== after.status) {
    const type = after.status === "RESOLVED" ? "TICKET_RESOLVED" : "STATUS_CHANGED";
    events.push({ ...base, type, from: before.status, to: after.status });
  }
  const changes = contentChanges(before, after);
  if (Object.keys(changes).length > 0) events.push({ ...base, type: "TICKET_UPDATED", changes });
  return events;
}
