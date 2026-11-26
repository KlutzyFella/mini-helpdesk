export type Role = "USER" | "ADMIN";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketCategory = "BUG" | "BILLING" | "ACCOUNT" | "FEATURE_REQUEST" | "OTHER";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Permissions {
  edit: boolean;
  priority: boolean;
  delete: boolean;
  comment: boolean;
  nextStatuses: TicketStatus[];
}

export interface TicketView {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdById: string;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  permissions: Permissions;
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: { field: string; message: string }[];
  requestId?: string;
}

export type Envelope<T, M = unknown> =
  | { success: true; data: T; error: null; meta: M | null }
  | { success: false; data: null; error: ApiErrorBody; meta?: null };
