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

export interface CommentView {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; role: Role };
}

export type ActivityType =
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "STATUS_CHANGED"
  | "TICKET_RESOLVED"
  | "COMMENT_ADDED";

export interface ActivityView {
  id: number;
  type: ActivityType;
  // Shape depends on `type`; lib/format.ts reads it defensively.
  metadata: unknown;
  createdAt: string;
  actor: { id: string; name: string; role: Role };
}

export interface TicketStats {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  byCategory: Record<TicketCategory, number>;
  avgResolutionHours: number | null;
}
