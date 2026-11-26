import type { TicketCategory, TicketPriority, TicketStatus } from "../../src/generated/prisma/enums.ts";
import { prisma } from "../../src/lib/prisma.ts";

export interface TicketOverrides {
  title?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  resolvedAt?: Date | null;
  createdAt?: Date;
}

export function createTicket(createdById: string, overrides: TicketOverrides = {}) {
  return prisma.ticket.create({
    data: {
      title: "Printer is on fire",
      description: "The office printer is producing smoke.",
      category: "BUG",
      ...overrides,
      createdById,
    },
  });
}
