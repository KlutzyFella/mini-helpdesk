import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { config } from "../src/config/env.ts";
import { subscribers, type Subscriber } from "../src/events/bus.ts";
import { prisma } from "../src/lib/prisma.ts";
import { createTicket } from "./helpers/tickets.ts";
import { createUser, type TestUser } from "./helpers/users.ts";

const app = createApp(config);

let alice: TestUser;
let bob: TestUser;
let admin: TestUser;

beforeEach(async () => {
  alice = await createUser({ name: "Alice" });
  bob = await createUser({ name: "Bob" });
  admin = await createUser({ role: "ADMIN", name: "Admin" });
});

const as = (u: TestUser) => ({
  get: (path: string) => request(app).get(path).set(u.authHeader),
  post: (path: string, body?: object) => request(app).post(path).set(u.authHeader).send(body),
});
const path = (ticketId: string) => `/api/tickets/${ticketId}/comments`;

describe("POST comments", () => {
  it("lets the owner comment and returns 201 with the author shape", async () => {
    const t = await createTicket(alice.user.id);
    const res = await as(alice).post(path(t.id), { body: "  Any update?  " });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      id: expect.any(String),
      body: "Any update?",
      createdAt: expect.any(String),
      author: { id: alice.user.id, name: "Alice", role: "USER" },
    });
  });

  it("lets an admin comment on any ticket", async () => {
    const t = await createTicket(alice.user.id);
    const res = await as(admin).post(path(t.id), { body: "On it." });
    expect(res.status).toBe(201);
    expect(res.body.data.author).toEqual({ id: admin.user.id, name: "Admin", role: "ADMIN" });
  });

  it("returns 404 for another user's ticket and writes nothing", async () => {
    const t = await createTicket(alice.user.id);
    const res = await as(bob).post(path(t.id), { body: "Hi" });
    expect(res.status).toBe(404);
    expect(await prisma.comment.count({ where: { ticketId: t.id } })).toBe(0);
  });

  it("returns 404 for a malformed or unknown ticket id", async () => {
    expect((await as(alice).post(path("not-a-uuid"), { body: "Hi" })).status).toBe(404);
    expect((await as(alice).post(path(randomUUID()), { body: "Hi" })).status).toBe(404);
  });

  it("returns 400 for an empty, blank, oversized or non-string body", async () => {
    const t = await createTicket(alice.user.id);
    for (const body of ["", "   ", "x".repeat(2001), 5]) {
      const res = await as(alice).post(path(t.id), { body });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
    expect((await as(alice).post(path(t.id), { body: "x".repeat(2000) })).status).toBe(201);
  });

  it("returns 400 for an unknown key", async () => {
    const t = await createTicket(alice.user.id);
    const res = await as(alice).post(path(t.id), { body: "Hi", authorId: bob.user.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 TICKET_CLOSED on a CLOSED ticket for the owner and an admin", async () => {
    const t = await createTicket(alice.user.id, { status: "CLOSED" });
    for (const u of [alice, admin]) {
      const res = await as(u).post(path(t.id), { body: "Late" });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("TICKET_CLOSED");
    }
    expect(await prisma.comment.count({ where: { ticketId: t.id } })).toBe(0);
  });

  it("allows comments on a RESOLVED ticket", async () => {
    const t = await createTicket(alice.user.id, { status: "RESOLVED", resolvedAt: new Date() });
    expect((await as(alice).post(path(t.id), { body: "Thanks" })).status).toBe(201);
  });

  it("returns 401 without a token", async () => {
    const t = await createTicket(alice.user.id);
    expect((await request(app).post(path(t.id)).send({ body: "Hi" })).status).toBe(401);
  });

  describe("event", () => {
    const seen: Parameters<Subscriber>[0][] = [];
    const spy: Subscriber = async (e) => {
      seen.push(e);
    };
    beforeEach(() => {
      seen.length = 0;
      subscribers.push(spy);
    });
    afterEach(() => {
      subscribers.splice(subscribers.indexOf(spy), 1);
    });

    it("publishes COMMENT_ADDED once per created comment and none on failure", async () => {
      const t = await createTicket(alice.user.id);
      await as(bob).post(path(t.id), { body: "nope" });
      await as(alice).post(path(t.id), { body: "" });
      expect(seen).toEqual([]);
      const res = await as(alice).post(path(t.id), { body: "Hello" });
      expect(seen).toEqual([
        { type: "COMMENT_ADDED", ticketId: t.id, actorId: alice.user.id, commentId: res.body.data.id },
      ]);
    });
  });
});

describe("GET comments", () => {
  it("returns an empty list for a ticket with no comments", async () => {
    const t = await createTicket(alice.user.id);
    const res = await as(alice).get(path(t.id));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("lists comments oldest first with id as the tiebreak, to both owner and admin", async () => {
    const t = await createTicket(alice.user.id);
    const base = new Date("2026-01-01T00:00:00.000Z");
    const rows = [
      { authorId: admin.user.id, body: "third", createdAt: new Date(base.getTime() + 1000) },
      { authorId: alice.user.id, body: "first", createdAt: base },
      { authorId: admin.user.id, body: "second-b", createdAt: new Date(base.getTime() + 500), id: "00000000-0000-4000-8000-000000000002" },
      { authorId: alice.user.id, body: "second-a", createdAt: new Date(base.getTime() + 500), id: "00000000-0000-4000-8000-000000000001" },
    ];
    for (const r of rows) await prisma.comment.create({ data: { ticketId: t.id, ...r } });
    const expected = ["first", "second-a", "second-b", "third"];
    for (const u of [alice, admin]) {
      const res = await as(u).get(path(t.id));
      expect(res.status).toBe(200);
      expect(res.body.data.map((c: { body: string }) => c.body)).toEqual(expected);
    }
  });

  it("returns the author on each item, in posting order through the API", async () => {
    const t = await createTicket(alice.user.id);
    await as(alice).post(path(t.id), { body: "Question" });
    await as(admin).post(path(t.id), { body: "Answer" });
    const res = await as(alice).get(path(t.id));
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.map((c: { author: { role: string } }) => c.author.role)).toEqual(["USER", "ADMIN"]);
    expect(res.body.data[1].author).toEqual({ id: admin.user.id, name: "Admin", role: "ADMIN" });
  });

  it("only returns comments of the requested ticket", async () => {
    const t1 = await createTicket(alice.user.id);
    const t2 = await createTicket(alice.user.id);
    await as(alice).post(path(t1.id), { body: "one" });
    await as(alice).post(path(t2.id), { body: "two" });
    const res = await as(alice).get(path(t1.id));
    expect(res.body.data.map((c: { body: string }) => c.body)).toEqual(["one"]);
  });

  it("still lists comments on a CLOSED ticket", async () => {
    const t = await createTicket(alice.user.id);
    await as(alice).post(path(t.id), { body: "before close" });
    await prisma.ticket.update({ where: { id: t.id }, data: { status: "CLOSED" } });
    const res = await as(alice).get(path(t.id));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("returns 404 to a USER reading comments on someone else's ticket", async () => {
    const t = await createTicket(alice.user.id);
    await as(alice).post(path(t.id), { body: "private" });
    const res = await as(bob).get(path(t.id));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a malformed or unknown id and 401 without a token", async () => {
    expect((await as(alice).get(path("not-a-uuid"))).status).toBe(404);
    expect((await as(alice).get(path(randomUUID()))).status).toBe(404);
    const t = await createTicket(alice.user.id);
    expect((await request(app).get(path(t.id))).status).toBe(401);
  });
});
