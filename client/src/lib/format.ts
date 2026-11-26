import { PRIORITY_LABELS, STATUS_LABELS } from "./enums";
import type { ActivityView, TicketPriority, TicketStatus } from "./types";

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

// Intl with no explicit timeZone uses the viewer's own time zone.
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateTime.format(d);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateOnly.format(d);
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as TicketStatus] ?? status;
}

function priorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority as TicketPriority] ?? priority;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function updateLabel(name: string, metadata: unknown): string {
  const changes = asRecord(asRecord(metadata).changes);
  const edited = (["title", "description", "category"] as const).filter((k) => k in changes);
  const parts: string[] = [];
  if (edited.length > 0) parts.push(`edited the ${joinList(edited)}`);
  if (typeof changes.priority === "string") parts.push(`set the priority to ${priorityLabel(changes.priority)}`);
  if (parts.length === 0) parts.push("edited the ticket");
  return `${name} ${parts.join(" and ")}`;
}

export function activityLabel(a: Pick<ActivityView, "type" | "metadata" | "actor">): string {
  const name = a.actor.name;
  switch (a.type) {
    case "TICKET_CREATED":
      return `${name} created the ticket`;
    case "TICKET_UPDATED":
      return updateLabel(name, a.metadata);
    case "STATUS_CHANGED": {
      const { from, to } = asRecord(a.metadata);
      return typeof from === "string" && typeof to === "string"
        ? `${name} moved it from ${statusLabel(from)} to ${statusLabel(to)}`
        : `${name} changed the status`;
    }
    case "TICKET_RESOLVED":
      return `${name} resolved it`;
    case "COMMENT_ADDED":
      return `${name} commented`;
    default:
      return `${name} made a change`;
  }
}

const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

export function formatHours(hours: number): string {
  const minutes = Math.round(hours * 60);
  if (minutes < 1) return "Under 1 min";
  if (minutes < 60) return `${minutes} min`;
  if (hours < 48) return `${oneDecimal(hours)} h`;
  return `${oneDecimal(hours / 24)} days`;
}
