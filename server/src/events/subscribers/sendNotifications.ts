import type { TicketStatus } from "../../generated/prisma/enums.ts";
import { prisma } from "../../lib/prisma.ts";
import { assertNever, type DomainEvent } from "../types.ts";

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

interface Plan {
  to: "owner" | "admins" | "nobody";
  message: string;
}

function planFor(e: DomainEvent, ticket: { title: string; createdById: string }): Plan {
  const { title } = ticket;
  switch (e.type) {
    case "TICKET_CREATED":
      return { to: "admins", message: `New ticket: "${title}"` };
    case "TICKET_UPDATED":
      return { to: "nobody", message: "" };
    case "STATUS_CHANGED":
      return { to: "owner", message: `"${title}" moved to ${STATUS_LABEL[e.to]}` };
    case "TICKET_RESOLVED":
      return { to: "owner", message: `"${title}" was resolved` };
    case "COMMENT_ADDED":
      return {
        to: e.actorId === ticket.createdById ? "admins" : "owner",
        message: `New comment on "${title}"`,
      };
    default:
      return assertNever(e);
  }
}

async function recipientIds(to: Plan["to"], ownerId: string): Promise<string[]> {
  if (to === "nobody") return [];
  if (to === "owner") return [ownerId];
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  return admins.map((a) => a.id);
}

export async function sendNotifications(e: DomainEvent): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: e.ticketId },
    select: { createdById: true, title: true },
  });
  if (!ticket) return;
  const plan = planFor(e, ticket);
  const ids = (await recipientIds(plan.to, ticket.createdById)).filter((id) => id !== e.actorId);
  if (ids.length === 0) return;
  await prisma.notification.createMany({
    data: ids.map((recipientId) => ({
      recipientId,
      ticketId: e.ticketId,
      type: e.type,
      message: plan.message,
    })),
  });
}
