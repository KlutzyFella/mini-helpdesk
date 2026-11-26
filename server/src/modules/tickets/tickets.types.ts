import type { Role, TicketCategory, TicketPriority, TicketStatus } from "../../generated/prisma/enums.ts";

export interface Actor {
  id: string;
  role: Role;
}

export interface TicketState {
  status: TicketStatus;
  createdById: string;
  resolvedAt: Date | null;
}

export interface Permissions {
  edit: boolean;
  priority: boolean;
  delete: boolean;
  comment: boolean;
  nextStatuses: readonly TicketStatus[];
}

export interface TicketRow extends TicketState {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string };
}

export type TicketView = TicketRow & { permissions: Permissions };
