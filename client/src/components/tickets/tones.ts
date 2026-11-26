import type { TicketCategory, TicketPriority, TicketStatus } from "../../lib/types";

// Each enum value owns one tone. Badges, dashboard bars and triage selects all read from here.
export const STATUS_TONE: Record<TicketStatus, string> = {
  OPEN: "tone-blue",
  IN_PROGRESS: "tone-amber",
  RESOLVED: "tone-green",
  CLOSED: "tone-gray",
};

export const PRIORITY_TONE: Record<TicketPriority, string> = {
  LOW: "tone-gray",
  MEDIUM: "tone-blue",
  HIGH: "tone-orange",
  URGENT: "tone-red",
};

export const PRIORITY_LEVEL: Record<TicketPriority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };

export const CATEGORY_TONE: Record<TicketCategory, string> = {
  BUG: "tone-red",
  BILLING: "tone-green",
  ACCOUNT: "tone-violet",
  FEATURE_REQUEST: "tone-teal",
  OTHER: "tone-gray",
};
