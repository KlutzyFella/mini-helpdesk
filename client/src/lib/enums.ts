import type { Role, TicketCategory, TicketPriority, TicketStatus } from "./types";

export const ROLES: readonly Role[] = ["USER", "ADMIN"];
export const STATUSES: readonly TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
export const PRIORITIES: readonly TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const CATEGORIES: readonly TicketCategory[] = [
  "BUG",
  "BILLING",
  "ACCOUNT",
  "FEATURE_REQUEST",
  "OTHER",
];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  BUG: "Bug",
  BILLING: "Billing",
  ACCOUNT: "Account",
  FEATURE_REQUEST: "Feature request",
  OTHER: "Other",
};
