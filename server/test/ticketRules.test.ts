import { describe, expect, it } from "vitest";
import { TicketStatus } from "../src/generated/prisma/enums.ts";
import {
  TRANSITIONS,
  checkAdminPatch,
  checkDelete,
  checkOwnerEdit,
  eventsForUpdate,
  nextResolvedAt,
  permissionsFor,
} from "../src/modules/tickets/tickets.rules.ts";
import type { Actor, TicketState } from "../src/modules/tickets/tickets.types.ts";

const STATUSES = Object.values(TicketStatus);
const owner: Actor = { id: "owner", role: "USER" };
const admin: Actor = { id: "admin", role: "ADMIN" };
const ticketIn = (status: TicketStatus): TicketState => ({ status, createdById: owner.id, resolvedAt: null });

describe("TRANSITIONS", () => {
  for (const from of STATUSES) {
    for (const to of STATUSES) {
      const allowed = TRANSITIONS[from].includes(to);
      it(`${from} -> ${to} is ${allowed ? "allowed" : "rejected"}`, () => {
        const denial = checkAdminPatch(ticketIn(from), { status: to });
        if (allowed) expect(denial).toBeNull();
        else expect(denial?.code).toBe(from === "CLOSED" ? "TICKET_CLOSED" : "INVALID_TRANSITION");
      });
    }
  }

  it("checks a mixed patch whole", () => {
    expect(checkAdminPatch(ticketIn("OPEN"), { status: "RESOLVED", priority: "HIGH" })?.code).toBe(
      "INVALID_TRANSITION",
    );
    expect(checkAdminPatch(ticketIn("OPEN"), { status: "IN_PROGRESS", priority: "HIGH" })).toBeNull();
  });
});

describe("nextResolvedAt", () => {
  const now = new Date("2026-01-02T00:00:00Z");
  const earlier = new Date("2026-01-01T00:00:00Z");

  it("sets the time on RESOLVED", () => expect(nextResolvedAt("RESOLVED", null, now)).toEqual(now));
  it("keeps the time on CLOSED", () => expect(nextResolvedAt("CLOSED", earlier, now)).toEqual(earlier));
  it("clears the time otherwise", () => {
    expect(nextResolvedAt("IN_PROGRESS", earlier, now)).toBeNull();
    expect(nextResolvedAt("OPEN", earlier, now)).toBeNull();
  });
});

describe("eventsForUpdate", () => {
  const before = {
    id: "t1",
    status: "OPEN",
    title: "Old title",
    description: "Old description",
    category: "BUG",
    priority: "MEDIUM",
  } as const;

  it("emits one TICKET_UPDATED with only changed fields for a content change", () => {
    const events = eventsForUpdate(before, { ...before, title: "New title" }, "a1");
    expect(events).toEqual([
      { type: "TICKET_UPDATED", ticketId: "t1", actorId: "a1", changes: { title: "New title" } },
    ]);
  });

  it("emits STATUS_CHANGED for a status move", () => {
    const events = eventsForUpdate(before, { ...before, status: "IN_PROGRESS" }, "a1");
    expect(events).toEqual([
      { type: "STATUS_CHANGED", ticketId: "t1", actorId: "a1", from: "OPEN", to: "IN_PROGRESS" },
    ]);
  });

  it("emits TICKET_RESOLVED for a move to RESOLVED", () => {
    const events = eventsForUpdate({ ...before, status: "IN_PROGRESS" }, { ...before, status: "RESOLVED" }, "a1");
    expect(events).toEqual([
      { type: "TICKET_RESOLVED", ticketId: "t1", actorId: "a1", from: "IN_PROGRESS", to: "RESOLVED" },
    ]);
  });

  it("emits the status event first for a mixed status and priority change", () => {
    const events = eventsForUpdate(before, { ...before, status: "IN_PROGRESS", priority: "URGENT" }, "a1");
    expect(events.map((e) => e.type)).toEqual(["STATUS_CHANGED", "TICKET_UPDATED"]);
    expect(events[1]).toMatchObject({ changes: { priority: "URGENT" } });
  });

  it("emits nothing when nothing changed", () => expect(eventsForUpdate(before, before, "a1")).toEqual([]));
});

describe("permissionsFor agrees with the check functions", () => {
  for (const status of STATUSES) {
    it(`owner edit and delete in ${status}`, () => {
      const t = ticketIn(status);
      const p = permissionsFor(owner, t);
      expect(p.edit).toBe(checkOwnerEdit(t) === null);
      expect(p.delete).toBe(checkDelete(t) === null);
      expect(p.priority).toBe(false);
      expect(p.nextStatuses).toEqual([]);
    });

    it(`admin priority in ${status}`, () => {
      const t = ticketIn(status);
      const p = permissionsFor(admin, t);
      expect(p.priority).toBe(checkAdminPatch(t, { priority: "HIGH" }) === null);
      expect(p.edit).toBe(false);
      expect(p.delete).toBe(false);
    });

    it(`comment in ${status}`, () => {
      expect(permissionsFor(owner, ticketIn(status)).comment).toBe(status !== "CLOSED");
    });

    for (const to of STATUSES) {
      it(`admin nextStatuses in ${status} ${TRANSITIONS[status].includes(to) ? "includes" : "excludes"} ${to}`, () => {
        const t = ticketIn(status);
        expect(permissionsFor(admin, t).nextStatuses.includes(to)).toBe(checkAdminPatch(t, { status: to }) === null);
      });
    }
  }

  it("denies a USER who does not own the ticket", () => {
    const p = permissionsFor({ id: "stranger", role: "USER" }, ticketIn("OPEN"));
    expect(p.edit).toBe(false);
    expect(p.delete).toBe(false);
  });
});
