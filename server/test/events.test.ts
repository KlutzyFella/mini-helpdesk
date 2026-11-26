import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.ts";
import { config } from "../src/config/env.ts";
import { subscribers, type Subscriber } from "../src/events/bus.ts";
import { prisma } from "../src/lib/prisma.ts";
import { logger } from "../src/lib/logger.ts";
import { createTicket } from "./helpers/tickets.ts";
import { createUser, type TestUser } from "./helpers/users.ts";

const app = createApp(config);

let alice: TestUser;
let bob: TestUser;
let admin: TestUser;
let admin2: TestUser;

beforeEach(async () => {
  alice = await createUser({ name: "Alice" });
  bob = await createUser({ name: "Bob" });
  admin = await createUser({ role: "ADMIN", name: "Admin" });
  admin2 = await createUser({ role: "ADMIN", name: "Admin Two" });
});

const as = (u: TestUser) => ({
  get: (p: string) => request(app).get(p).set(u.authHeader),
  post: (p: string, body?: object) => request(app).post(p).set(u.authHeader).send(body),
  patch: (p: string, body?: object) => request(app).patch(p).set(u.authHeader).send(body),
  del: (p: string) => request(app).delete(p).set(u.authHeader),
});

const newTicket = async (u = alice) => {
  const res = await as(u).post("/api/tickets", {
    title: "Printer is on fire",
    description: "The office printer is producing smoke.",
    category: "BUG",
  });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
};

const activity = async (ticketId: string) =>
  prisma.activityLog.findMany({ where: { ticketId }, orderBy: { id: "asc" } });

const unread = (u: TestUser) => prisma.notification.count({ where: { recipientId: u.user.id, readAt: null } });

describe("full lifecycle", () => {
  it("records the six activity rows in order with the right metadata", async () => {
    const id = await newTicket();
    await as(alice).patch(`/api/tickets/${id}`, { title: "Printer smoking" });
    await as(admin).patch(`/api/admin/tickets/${id}`, { status: "IN_PROGRESS" });
    await as(admin).patch(`/api/admin/tickets/${id}`, { status: "RESOLVED" });
    const c1 = await as(alice).post(`/api/tickets/${id}/comments`, { body: "Thanks" });
    const c2 = await as(admin).post(`/api/tickets/${id}/comments`, { body: "Welcome" });

    const rows = await activity(id);
    expect(rows.map((r) => r.type)).toEqual([
      "TICKET_CREATED",
      "TICKET_UPDATED",
      "STATUS_CHANGED",
      "TICKET_RESOLVED",
      "COMMENT_ADDED",
      "COMMENT_ADDED",
    ]);
    expect(rows.map((r) => r.actorId)).toEqual([
      alice.user.id,
      alice.user.id,
      admin.user.id,
      admin.user.id,
      alice.user.id,
      admin.user.id,
    ]);
    expect(rows.map((r) => r.metadata)).toEqual([
      null,
      { changes: { title: "Printer smoking" } },
      { from: "OPEN", to: "IN_PROGRESS" },
      { from: "IN_PROGRESS", to: "RESOLVED" },
      { commentId: c1.body.data.id },
      { commentId: c2.body.data.id },
    ]);
  });

  it("notifies exactly the right people and never the actor", async () => {
    const id = await newTicket();
    await as(alice).patch(`/api/tickets/${id}`, { title: "Printer smoking" });
    await as(admin).patch(`/api/admin/tickets/${id}`, { status: "IN_PROGRESS" });
    await as(admin).patch(`/api/admin/tickets/${id}`, { status: "RESOLVED" });
    await as(alice).post(`/api/tickets/${id}/comments`, { body: "Thanks" });
    await as(admin).post(`/api/tickets/${id}/comments`, { body: "Welcome" });

    expect(await unread(alice)).toBe(3);
    expect(await unread(admin)).toBe(2);
    expect(await unread(admin2)).toBe(2);
    expect(await unread(bob)).toBe(0);

    const owner = await prisma.notification.findMany({
      where: { recipientId: alice.user.id },
      orderBy: { createdAt: "asc" },
    });
    expect(owner.map((n) => [n.type, n.message])).toEqual([
      ["STATUS_CHANGED", '"Printer smoking" moved to In progress'],
      ["TICKET_RESOLVED", '"Printer smoking" was resolved'],
      ["COMMENT_ADDED", 'New comment on "Printer smoking"'],
    ]);
    const adm = await prisma.notification.findMany({
      where: { recipientId: admin.user.id },
      orderBy: { createdAt: "asc" },
    });
    expect(adm.map((n) => [n.type, n.message])).toEqual([
      ["TICKET_CREATED", 'New ticket: "Printer is on fire"'],
      ["COMMENT_ADDED", 'New comment on "Printer smoking"'],
    ]);
  });

  it("an owner edit alone notifies nobody", async () => {
    const id = await newTicket();
    await prisma.notification.deleteMany();
    await as(alice).patch(`/api/tickets/${id}`, { title: "Edited title" });
    expect(await prisma.notification.count()).toBe(0);
  });

  it("an admin comment notifies only the owner", async () => {
    const id = await newTicket();
    await prisma.notification.deleteMany();
    await as(admin).post(`/api/tickets/${id}/comments`, { body: "Hi" });
    const rows = await prisma.notification.findMany();
    expect(rows.map((n) => n.recipientId)).toEqual([alice.user.id]);
  });

  it("a mixed admin PATCH writes the status event first, then TICKET_UPDATED", async () => {
    const id = await newTicket();
    const res = await as(admin).patch(`/api/admin/tickets/${id}`, { status: "IN_PROGRESS", priority: "URGENT" });
    expect(res.status).toBe(200);
    const rows = (await activity(id)).slice(1);
    expect(rows.map((r) => r.type)).toEqual(["STATUS_CHANGED", "TICKET_UPDATED"]);
    expect(rows[1]?.metadata).toEqual({ changes: { priority: "URGENT" } });
    expect(await unread(alice)).toBe(1);
  });
});

describe("GET /api/tickets/:id/activity", () => {
  it("returns the view shape in id order to the owner and an admin", async () => {
    const id = await newTicket();
    await as(admin).patch(`/api/admin/tickets/${id}`, { status: "IN_PROGRESS" });
    for (const u of [alice, admin]) {
      const res = await as(u).get(`/api/tickets/${id}/activity`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        {
          id: expect.any(Number),
          type: "TICKET_CREATED",
          metadata: null,
          createdAt: expect.any(String),
          actor: { id: alice.user.id, name: "Alice", role: "USER" },
        },
        {
          id: expect.any(Number),
          type: "STATUS_CHANGED",
          metadata: { from: "OPEN", to: "IN_PROGRESS" },
          createdAt: expect.any(String),
          actor: { id: admin.user.id, name: "Admin", role: "ADMIN" },
        },
      ]);
      expect(res.body.data[0].id).toBeLessThan(res.body.data[1].id);
    }
  });

  it("returns 404 on someone else's ticket, a malformed id and an unknown id, and 401 without a token", async () => {
    const id = await newTicket();
    expect((await as(bob).get(`/api/tickets/${id}/activity`)).status).toBe(404);
    expect((await as(alice).get("/api/tickets/not-a-uuid/activity")).status).toBe(404);
    expect((await as(alice).get(`/api/tickets/${randomUUID()}/activity`)).status).toBe(404);
    expect((await request(app).get(`/api/tickets/${id}/activity`)).status).toBe(401);
  });
});

describe("notifications API", () => {
  const seed = async (ticketId: string, recipientId: string, n: number) => {
    const base = new Date("2026-01-01T00:00:00.000Z").getTime();
    await prisma.notification.createMany({
      data: Array.from({ length: n }, (_, i) => ({
        recipientId,
        ticketId,
        type: "STATUS_CHANGED" as const,
        message: `n${i}`,
        createdAt: new Date(base + i * 1000),
      })),
    });
  };

  it("returns the newest 20 with the view shape and counts all unread", async () => {
    const t = await createTicket(alice.user.id);
    await seed(t.id, alice.user.id, 25);
    const res = await as(alice).get("/api/notifications");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body.meta).toEqual({ unreadCount: 25 });
    expect(res.body.data[0]).toEqual({
      id: expect.any(String),
      type: "STATUS_CHANGED",
      message: "n24",
      readAt: null,
      createdAt: expect.any(String),
      ticket: { id: t.id, title: "Printer is on fire" },
    });
    expect(res.body.data[19].message).toBe("n5");
  });

  it("only lists the caller's notifications and requires auth", async () => {
    const id = await newTicket();
    expect((await as(bob).get("/api/notifications")).body.data).toEqual([]);
    expect((await as(admin).get("/api/notifications")).body.data).toHaveLength(1);
    expect(id).toBeTruthy();
    expect((await request(app).get("/api/notifications")).status).toBe(401);
  });

  it("mark-read sets readAt once and is repeatable with the same value", async () => {
    const t = await createTicket(alice.user.id);
    await seed(t.id, alice.user.id, 2);
    const list = await as(alice).get("/api/notifications");
    const id = list.body.data[0].id as string;
    const first = await as(alice).patch(`/api/notifications/${id}/read`);
    expect(first.status).toBe(200);
    expect(first.body.data.readAt).toEqual(expect.any(String));
    expect(first.body.data.ticket).toEqual({ id: t.id, title: "Printer is on fire" });
    const second = await as(alice).patch(`/api/notifications/${id}/read`);
    expect(second.status).toBe(200);
    expect(second.body.data.readAt).toBe(first.body.data.readAt);
    expect((await as(alice).get("/api/notifications")).body.meta).toEqual({ unreadCount: 1 });
  });

  it("mark-read returns 404 for another user's, unknown and malformed ids", async () => {
    const t = await createTicket(alice.user.id);
    await seed(t.id, alice.user.id, 1);
    const n = await prisma.notification.findFirstOrThrow();
    expect((await as(bob).patch(`/api/notifications/${n.id}/read`)).status).toBe(404);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).readAt).toBeNull();
    expect((await as(alice).patch(`/api/notifications/${randomUUID()}/read`)).status).toBe(404);
    expect((await as(alice).patch("/api/notifications/nope/read")).status).toBe(404);
    expect((await request(app).patch(`/api/notifications/${n.id}/read`)).status).toBe(401);
  });

  it("read-all marks every unread one up to the cutoff, past the newest 20, and only the caller's", async () => {
    const t = await createTicket(alice.user.id);
    await seed(t.id, alice.user.id, 25);
    await seed(t.id, bob.user.id, 2);
    const cutoff = "2026-01-01T00:00:22.000Z";
    const res = await as(alice).patch("/api/notifications/read-all", { before: cutoff });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ updated: 23 });
    expect((await as(alice).get("/api/notifications")).body.meta).toEqual({ unreadCount: 2 });
    expect((await as(bob).get("/api/notifications")).body.meta).toEqual({ unreadCount: 2 });
    const again = await as(alice).patch("/api/notifications/read-all", { before: cutoff });
    expect(again.body.data).toEqual({ updated: 0 });
  });

  it("read-all rejects a missing or malformed cutoff and requires auth", async () => {
    expect((await as(alice).patch("/api/notifications/read-all", {})).status).toBe(400);
    expect((await as(alice).patch("/api/notifications/read-all", { before: "yesterday" })).status).toBe(400);
    expect((await request(app).patch("/api/notifications/read-all").send({ before: "2026-01-01T00:00:00.000Z" })).status).toBe(401);
  });
});

describe("failure isolation and cascade", () => {
  it("logs a throwing subscriber and still returns 2xx", async () => {
    const boom: Subscriber = async () => {
      throw new Error("boom");
    };
    const spy = vi.spyOn(logger, "error").mockImplementation(() => undefined);
    subscribers.unshift(boom);
    try {
      const res = await as(alice).post("/api/tickets", {
        title: "Still works",
        description: "Subscriber failure must not fail the request.",
        category: "OTHER",
      });
      expect(res.status).toBe(201);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "TICKET_CREATED" }), "subscriber failed");
      expect(await prisma.activityLog.count()).toBe(1);
    } finally {
      subscribers.splice(subscribers.indexOf(boom), 1);
      spy.mockRestore();
    }
  });

  it("deleting an OPEN ticket removes its activity and notifications", async () => {
    const id = await newTicket();
    expect(await prisma.activityLog.count({ where: { ticketId: id } })).toBe(1);
    expect(await prisma.notification.count({ where: { ticketId: id } })).toBe(2);
    expect((await as(alice).del(`/api/tickets/${id}`)).status).toBe(204);
    expect(await prisma.activityLog.count({ where: { ticketId: id } })).toBe(0);
    expect(await prisma.notification.count({ where: { ticketId: id } })).toBe(0);
  });
});
