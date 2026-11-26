import { ApiError } from "./api";

const MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Please check the highlighted fields.",
  INVALID_CREDENTIALS: "Invalid email or password",
  UNAUTHENTICATED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You do not have permission to do that.",
  NOT_FOUND: "We could not find that.",
  EMAIL_TAKEN: "An account with this email already exists.",
  TICKET_LOCKED: "This ticket can no longer be changed because work has started on it.",
  INVALID_TRANSITION: "That status change is not allowed.",
  TICKET_CLOSED: "This ticket is closed.",
  CONCURRENT_UPDATE: "Someone else just changed this ticket. Reload and try again.",
  CONFLICT: "That conflicts with existing data.",
  PAYLOAD_TOO_LARGE: "That is too much text to send.",
  RATE_LIMITED: "Too many attempts. Please wait a minute and try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
  NETWORK_ERROR: "Could not reach the server. Check your connection and try again.",
};

export function messageFor(err: unknown): string {
  if (err instanceof ApiError) return MESSAGES[err.code] ?? err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export function fieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (err instanceof ApiError) {
    for (const d of err.details ?? []) if (!(d.field in out)) out[d.field] = d.message;
  }
  return out;
}
