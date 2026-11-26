import { describe, expect, it } from "vitest";
import { STATUSES } from "./enums";
import { activityLabel, formatHours, statusLabel } from "./format";
import type { ActivityView } from "./types";

const actor = (name: string, role: "USER" | "ADMIN" = "USER") => ({ id: "u", name, role });
const row = (
  type: ActivityView["type"],
  metadata: unknown = null,
  who = actor("Alice"),
): Pick<ActivityView, "type" | "metadata" | "actor"> => ({ type, metadata, actor: who });

describe("statusLabel", () => {
  it("maps every status to its display label", () => {
    expect(STATUSES.map(statusLabel)).toEqual(["Open", "In progress", "Resolved", "Closed"]);
  });

  it("falls back to the raw value for an unknown status", () => {
    expect(statusLabel("ARCHIVED")).toBe("ARCHIVED");
  });
});

describe("activityLabel", () => {
  it("TICKET_CREATED", () => {
    expect(activityLabel(row("TICKET_CREATED"))).toBe("Alice created the ticket");
  });

  it("TICKET_UPDATED names one edited field", () => {
    expect(activityLabel(row("TICKET_UPDATED", { changes: { title: "New" } }))).toBe("Alice edited the title");
  });

  it("TICKET_UPDATED joins several edited fields", () => {
    const changes = { title: "a", description: "b", category: "BUG" };
    expect(activityLabel(row("TICKET_UPDATED", { changes }))).toBe(
      "Alice edited the title, description and category",
    );
  });

  it("TICKET_UPDATED reports a priority change", () => {
    const label = activityLabel(row("TICKET_UPDATED", { changes: { priority: "HIGH" } }, actor("Admin", "ADMIN")));
    expect(label).toBe("Admin set the priority to High");
  });

  it("TICKET_UPDATED survives missing metadata", () => {
    expect(activityLabel(row("TICKET_UPDATED", null))).toBe("Alice edited the ticket");
  });

  it("STATUS_CHANGED shows both labels", () => {
    const label = activityLabel(
      row("STATUS_CHANGED", { from: "OPEN", to: "IN_PROGRESS" }, actor("Admin", "ADMIN")),
    );
    expect(label).toBe("Admin moved it from Open to In progress");
  });

  it("STATUS_CHANGED survives missing metadata", () => {
    expect(activityLabel(row("STATUS_CHANGED", {}))).toBe("Alice changed the status");
  });

  it("TICKET_RESOLVED", () => {
    const label = activityLabel(row("TICKET_RESOLVED", { from: "IN_PROGRESS", to: "RESOLVED" }, actor("Admin", "ADMIN")));
    expect(label).toBe("Admin resolved it");
  });

  it("COMMENT_ADDED", () => {
    expect(activityLabel(row("COMMENT_ADDED", { commentId: "c" }, actor("Admin", "ADMIN")))).toBe("Admin commented");
  });
});

describe("formatHours", () => {
  it("picks minutes, hours, or days by size", () => {
    expect(formatHours(0)).toBe("Under 1 min");
    expect(formatHours(0.5)).toBe("30 min");
    expect(formatHours(26.44)).toBe("26.4 h");
    expect(formatHours(72)).toBe("3 days");
    expect(formatHours(60)).toBe("2.5 days");
  });
});
