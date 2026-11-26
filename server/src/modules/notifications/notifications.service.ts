import { AppError } from "../../lib/errors.ts";
import { prisma } from "../../lib/prisma.ts";
import type { Actor } from "../tickets/tickets.types.ts";

const LIMIT = 20;

const select = {
  id: true,
  type: true,
  message: true,
  readAt: true,
  createdAt: true,
  ticket: { select: { id: true, title: true } },
} as const;

export async function list(actor: Actor) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: actor.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: LIMIT,
      select,
    }),
    prisma.notification.count({ where: { recipientId: actor.id, readAt: null } }),
  ]);
  return { items, unreadCount };
}

export async function markRead(actor: Actor, id: string) {
  await prisma.notification.updateMany({
    where: { id, recipientId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
  const row = await prisma.notification.findFirst({ where: { id, recipientId: actor.id }, select });
  if (!row) throw new AppError("NOT_FOUND", "Notification not found");
  return row;
}

export async function readAll(actor: Actor, before: Date): Promise<number> {
  const { count } = await prisma.notification.updateMany({
    where: { recipientId: actor.id, readAt: null, createdAt: { lte: before } },
    data: { readAt: new Date() },
  });
  return count;
}
