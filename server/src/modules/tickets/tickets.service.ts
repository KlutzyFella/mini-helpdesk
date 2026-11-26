import { publish } from "../../events/bus.ts";
import type { Prisma } from "../../generated/prisma/client.ts";
import { AppError } from "../../lib/errors.ts";
import { prisma } from "../../lib/prisma.ts";
import {
  checkAdminPatch,
  checkDelete,
  checkOwnerEdit,
  eventsForUpdate,
  nextResolvedAt,
  permissionsFor,
  type Denial,
} from "./tickets.rules.ts";
import type { AdminPatchBody, CreateBody, ListQuery, OwnerPatchBody } from "./tickets.schemas.ts";
import type { Actor, TicketRow, TicketView } from "./tickets.types.ts";

const withCreator = { createdBy: { select: { id: true, name: true } } } as const;

export function ticketScope(actor: Actor): Prisma.TicketWhereInput {
  return actor.role === "ADMIN" ? {} : { createdById: actor.id };
}

const toView = (actor: Actor, row: TicketRow): TicketView => ({ ...row, permissions: permissionsFor(actor, row) });

function deny(denial: Denial): never {
  throw new AppError(denial.code, denial.message);
}

const orDeny = (denial: Denial | null): void => {
  if (denial) deny(denial);
};

export async function findVisibleTicket(actor: Actor, id: string): Promise<TicketRow> {
  const row = await prisma.ticket.findFirst({ where: { id, ...ticketScope(actor) }, include: withCreator });
  if (!row) throw new AppError("NOT_FOUND", "Ticket not found");
  return row;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

function listWhere(actor: Actor, q: ListQuery): Prisma.TicketWhereInput {
  const { status, priority, category, search } = q;
  const contains = (field: "title" | "description") => ({
    [field]: { contains: escapeLike(search ?? ""), mode: "insensitive" as const },
  });
  return {
    ...ticketScope(actor),
    ...(status && { status }),
    ...(priority && { priority }),
    ...(category && { category }),
    ...(search && { OR: [contains("title"), contains("description")] }),
  };
}

export async function list(actor: Actor, q: ListQuery) {
  const where = listWhere(actor, q);
  const [rows, total] = await prisma.$transaction(
    [
      prisma.ticket.findMany({
        where,
        include: withCreator,
        orderBy: [{ [q.sort]: q.order }, { id: q.order }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.ticket.count({ where }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  return {
    items: rows.map((r) => toView(actor, r)),
    meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
  };
}

export async function get(actor: Actor, id: string): Promise<TicketView> {
  return toView(actor, await findVisibleTicket(actor, id));
}

export async function create(actor: Actor, body: CreateBody): Promise<TicketView> {
  const row = await prisma.ticket.create({ data: { ...body, createdById: actor.id }, include: withCreator });
  await publish([{ type: "TICKET_CREATED", ticketId: row.id, actorId: actor.id }]);
  return toView(actor, row);
}

async function settle(actor: Actor, before: TicketRow): Promise<TicketView> {
  const after = await prisma.ticket.findUniqueOrThrow({ where: { id: before.id }, include: withCreator });
  await publish(eventsForUpdate(before, after, actor.id));
  return toView(actor, after);
}

const ownerGuard = (actor: Actor, id: string): Prisma.TicketWhereInput => ({
  id,
  createdById: actor.id,
  status: "OPEN",
});

export async function ownerUpdate(actor: Actor, id: string, patch: OwnerPatchBody): Promise<TicketView> {
  const before = await findVisibleTicket(actor, id);
  orDeny(checkOwnerEdit(before));
  const { count } = await prisma.ticket.updateMany({ where: ownerGuard(actor, id), data: patch });
  if (count === 0) throw new AppError("TICKET_LOCKED", "Only an OPEN ticket can be edited");
  return settle(actor, before);
}

function adminData(before: TicketRow, patch: AdminPatchBody): Prisma.TicketUpdateManyMutationInput {
  if (patch.status === undefined) return { priority: patch.priority };
  return {
    status: patch.status,
    priority: patch.priority,
    resolvedAt: nextResolvedAt(patch.status, before.resolvedAt, new Date()),
  };
}

export async function adminUpdate(actor: Actor, id: string, patch: AdminPatchBody): Promise<TicketView> {
  const before = await findVisibleTicket(actor, id);
  orDeny(checkAdminPatch(before, patch));
  const movesStatus = patch.status !== undefined;
  const where: Prisma.TicketWhereInput = movesStatus ? { id, status: before.status } : { id, status: { not: "CLOSED" } };
  const { count } = await prisma.ticket.updateMany({ where, data: adminData(before, patch) });
  if (count === 0) {
    throw movesStatus
      ? new AppError("CONCURRENT_UPDATE", "The ticket was changed by someone else, reload and retry")
      : new AppError("TICKET_CLOSED", "A closed ticket cannot be changed");
  }
  return settle(actor, before);
}

export async function remove(actor: Actor, id: string): Promise<void> {
  const before = await findVisibleTicket(actor, id);
  orDeny(checkDelete(before));
  const { count } = await prisma.ticket.deleteMany({ where: ownerGuard(actor, id) });
  if (count === 0) throw new AppError("TICKET_LOCKED", "Only an OPEN ticket can be deleted");
}
