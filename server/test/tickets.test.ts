import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { config } from "../src/config/env.ts";
import { prisma } from "../src/lib/prisma.ts";
import { createTicket } from "./helpers/tickets.ts";
import { createUser, type TestUser } from "./helpers/users.ts";

const app = createApp(config);
const validBody = { title: "Cannot log in", description: "Login page shows a blank screen.", category: "BUG" };

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
  patch: (path: string, body?: object) => request(app).patch(path).set(u.authHeader).send(body),
  del: (path: string) => request(app).delete(path).set(u.authHeader),
});

describe("create", () => {
  it("returns 201 with the view, defaults to MEDIUM and OPEN, and carries permissions", async () => {
    const res = await as(alice).post("/api/tickets", validBody);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: validBody.title,
      priority: "MEDIUM",
      status: "OPEN",
      createdBy: { id: alice.user.id, name: "Alice" },
      permissions: { edit: true, delete: true, priority: false, comment: true, nextStatuses: [] },
    });
  });

  it("accepts an explicit priority", async () => {
    const res = await as(alice).post("/api/tickets", { ...validBody, priority: "HIGH" });
    expect(res.body.data.priority).toBe("HIGH");
  });

  it("rejects short fields and unknown keys with 400", async () => {
    expect((await as(alice).post("/api/tickets", { ...validBody, title: "ab" })).status).toBe(400);
    expect((await as(alice).post("/api/tickets", { ...validBody, status: "CLOSED" })).status).toBe(400);
  });

  it("returns 403 for an ADMIN and 401 without a token", async () => {
    expect((await as(admin).post("/api/tickets", validBody)).status).toBe(403);
    expect((await request(app).post("/api/tickets").send(validBody)).status).toBe(401);
  });
});

describe("visibility", () => {
  it("returns 404 to user A for user B's ticket on GET, PATCH and DELETE", async () => {
    const t = await createTicket(bob.user.id);
    const [get, patch, del] = await Promise.all([
      as(alice).get(`/api/tickets/${t.id}`),
      as(alice).patch(`/api/tickets/${t.id}`, { title: "Hijacked" }),
      as(alice).del(`/api/tickets/${t.id}`),
    ]);
    for (const res of [get, patch, del]) {
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    }
    expect(await prisma.ticket.count()).toBe(1);
  });

  it("returns 404 for a malformed id", async () => {
    const res = await as(alice).get("/api/tickets/not-a-uuid");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for an unknown but well-formed id", async () => {
    const res = await as(alice).get("/api/tickets/7c9e6679-7425-40de-944b-e07fc1f90ae7");
    expect(res.status).toBe(404);
  });

  it("lets an ADMIN read any ticket", async () => {
    const t = await createTicket(bob.user.id);
    const res = await as(admin).get(`/api/tickets/${t.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.createdBy.name).toBe("Bob");
  });
});

describe("role gates", () => {
  it("gives a USER 403 on the admin route", async () => {
    const t = await createTicket(alice.user.id);
    expect((await as(alice).patch(`/api/admin/tickets/${t.id}`, { priority: "HIGH" })).status).toBe(403);
  });

  it("gives an ADMIN 403 on the owner PATCH and on DELETE", async () => {
    const t = await createTicket(alice.user.id);
    expect((await as(admin).patch(`/api/tickets/${t.id}`, { title: "Admin edit" })).status).toBe(403);
    expect((await as(admin).del(`/api/tickets/${t.id}`)).status).toBe(403);
    expect(await prisma.ticket.count()).toBe(1);
  });
});

describe("owner edit and delete", () => {
  it("edits content and returns the updated view", async () => {
    const t = await createTicket(alice.user.id);
    const res = await as(alice).patch(`/api/tickets/${t.id}`, { title: "A better title" });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("A better title");
  });

  it("returns 400 naming the field when a USER sends status", async () => {
    const t = await createTicket(alice.user.id);
    const res = await as(alice).patch(`/api/tickets/${t.id}`, { status: "CLOSED" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(res.body.error.details)).toContain("status");
  });

  it("returns 400 for an empty body on either PATCH", async () => {
    const t = await createTicket(alice.user.id);
    expect((await as(alice).patch(`/api/tickets/${t.id}`, {})).status).toBe(400);
    expect((await as(admin).patch(`/api/admin/tickets/${t.id}`, {})).status).toBe(400);
  });

  it("returns 409 TICKET_LOCKED for edit and delete once the ticket is IN_PROGRESS", async () => {
    const t = await createTicket(alice.user.id, { status: "IN_PROGRESS" });
    const edit = await as(alice).patch(`/api/tickets/${t.id}`, { title: "Too late" });
    const del = await as(alice).del(`/api/tickets/${t.id}`);
    expect([edit.status, edit.body.error.code]).toEqual([409, "TICKET_LOCKED"]);
    expect([del.status, del.body.error.code]).toEqual([409, "TICKET_LOCKED"]);
    expect(await prisma.ticket.count()).toBe(1);
  });

  it("deletes an OPEN ticket with 204", async () => {
    const t = await createTicket(alice.user.id);
    const res = await as(alice).del(`/api/tickets/${t.id}`);
    expect(res.status).toBe(204);
    expect(await prisma.ticket.count()).toBe(0);
  });
});

describe("admin triage", () => {
  it("moves status and priority together and returns the new view", async () => {
    const t = await createTicket(alice.user.id);
    const res = await as(admin).patch(`/api/admin/tickets/${t.id}`, { status: "IN_PROGRESS", priority: "URGENT" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: "IN_PROGRESS",
      priority: "URGENT",
      permissions: { nextStatuses: ["RESOLVED", "OPEN"], priority: true },
    });
  });

  it("rejects OPEN to RESOLVED and OPEN to OPEN with INVALID_TRANSITION", async () => {
    const open = await createTicket(alice.user.id);
    const bad = await as(admin).patch(`/api/admin/tickets/${open.id}`, { status: "RESOLVED" });
    expect([bad.status, bad.body.error.code]).toEqual([409, "INVALID_TRANSITION"]);
    const same = await as(admin).patch(`/api/admin/tickets/${open.id}`, { status: "OPEN" });
    expect([same.status, same.body.error.code]).toEqual([409, "INVALID_TRANSITION"]);
  });

  it("returns 409 TICKET_CLOSED for any admin change on a CLOSED ticket", async () => {
    const t = await createTicket(alice.user.id, { status: "CLOSED" });
    for (const body of [{ status: "OPEN" }, { priority: "HIGH" }, { status: "CLOSED" }]) {
      const res = await as(admin).patch(`/api/admin/tickets/${t.id}`, body);
      expect([res.status, res.body.error.code]).toEqual([409, "TICKET_CLOSED"]);
    }
  });

  it("applies a mixed patch all or nothing", async () => {
    const t = await createTicket(alice.user.id);
    const res = await as(admin).patch(`/api/admin/tickets/${t.id}`, { status: "RESOLVED", priority: "URGENT" });
    expect(res.status).toBe(409);
    const row = await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect([row.status, row.priority]).toEqual(["OPEN", "MEDIUM"]);
  });

  it("keeps resolvedAt through RESOLVED then CLOSED and clears it on a move back", async () => {
    const t = await createTicket(alice.user.id, { status: "IN_PROGRESS" });
    const patch = (status: string) => as(admin).patch(`/api/admin/tickets/${t.id}`, { status });
    const resolved = await patch("RESOLVED");
    expect(resolved.body.data.resolvedAt).toEqual(expect.any(String));
    const closed = await patch("CLOSED");
    expect(closed.body.data.resolvedAt).toBe(resolved.body.data.resolvedAt);

    const t2 = await createTicket(alice.user.id, { status: "RESOLVED", resolvedAt: new Date() });
    const back = await as(admin).patch(`/api/admin/tickets/${t2.id}`, { status: "IN_PROGRESS" });
    expect(back.body.data.resolvedAt).toBeNull();
  });
});

describe("list filters and search", () => {
  it("scopes a USER to their own tickets and an ADMIN to all", async () => {
    await createTicket(alice.user.id);
    await createTicket(bob.user.id);
    expect((await as(alice).get("/api/tickets")).body.meta.total).toBe(1);
    expect((await as(admin).get("/api/tickets")).body.meta.total).toBe(2);
  });

  it("filters by status, priority and category", async () => {
    await createTicket(alice.user.id, { priority: "HIGH", category: "BILLING" });
    await createTicket(alice.user.id, { priority: "LOW", status: "RESOLVED" });
    const hit = await as(admin).get("/api/tickets?status=OPEN&priority=HIGH&category=BILLING");
    expect(hit.body.data).toHaveLength(1);
    const miss = await as(admin).get("/api/tickets?status=OPEN&priority=LOW");
    expect(miss.body.data).toHaveLength(0);
  });

  it("searches title and description case-insensitively and treats % literally", async () => {
    await createTicket(alice.user.id, { title: "Invoice wrong", description: "Charged twice for the plan." });
    await createTicket(alice.user.id, { title: "Discount 50% off", description: "Does the coupon apply here?" });
    await createTicket(alice.user.id, { title: "Under_score name", description: "Nothing special in here." });
    const titles = async (q: string) =>
      (await as(alice).get(`/api/tickets?search=${encodeURIComponent(q)}`)).body.data.map(
        (t: { title: string }) => t.title,
      );
    expect(await titles("INVOICE")).toEqual(["Invoice wrong"]);
    expect(await titles("charged TWICE")).toEqual(["Invoice wrong"]);
    expect(await titles("%")).toEqual(["Discount 50% off"]);
    expect(await titles("_")).toEqual(["Under_score name"]);
    expect(await titles("\\")).toEqual([]);
  });

  it("treats an empty search as absent", async () => {
    await createTicket(alice.user.id);
    const res = await as(alice).get("/api/tickets?search=");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe("list sort and pagination", () => {
  beforeEach(async () => {
    for (const [i, priority] of (["LOW", "URGENT", "MEDIUM", "HIGH", "LOW"] as const).entries()) {
      await createTicket(alice.user.id, { title: `Ticket number ${i}`, priority });
    }
  });

  it("sorts by createdAt in both orders", async () => {
    const asc = await as(alice).get("/api/tickets?order=asc");
    const desc = await as(alice).get("/api/tickets?order=desc");
    const titles = (r: request.Response) => r.body.data.map((t: { title: string }) => t.title);
    expect(titles(asc)).toEqual(titles(desc).toReversed());
    expect(titles(asc)[0]).toBe("Ticket number 0");
  });

  it("sorts by priority without repeating rows across pages", async () => {
    const first = await as(alice).get("/api/tickets?sort=priority&order=asc&limit=2&page=1");
    const second = await as(alice).get("/api/tickets?sort=priority&order=asc&limit=2&page=2");
    const third = await as(alice).get("/api/tickets?sort=priority&order=asc&limit=2&page=3");
    const ids = [first, second, third].flatMap((r) => r.body.data.map((t: { id: string }) => t.id));
    expect(new Set(ids).size).toBe(5);
    expect(first.body.data.map((t: { priority: string }) => t.priority)).toEqual(["LOW", "LOW"]);
  });

  it("reports meta and returns an empty list past the end", async () => {
    const res = await as(alice).get("/api/tickets?limit=2&page=2");
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
    const past = await as(alice).get("/api/tickets?limit=2&page=9");
    expect(past.status).toBe(200);
    expect(past.body.data).toEqual([]);
    expect(past.body.meta.totalPages).toBe(3);
  });

  it("returns 400 for out-of-range page, limit, sort and order", async () => {
    for (const q of ["page=0", "limit=0", "limit=51", "page=abc", "sort=title", "order=up", "search=" + "a".repeat(101)]) {
      const res = await as(alice).get(`/api/tickets?${q}`);
      expect([q, res.status]).toEqual([q, 400]);
    }
  });
});

describe("permissions in responses", () => {
  it("matches role and status on the list and the detail", async () => {
    const t = await createTicket(alice.user.id);
    const ownerView = (await as(alice).get(`/api/tickets/${t.id}`)).body.data;
    expect(ownerView.permissions).toEqual({
      edit: true,
      priority: false,
      delete: true,
      comment: true,
      nextStatuses: [],
    });
    const adminView = (await as(admin).get("/api/tickets")).body.data[0];
    expect(adminView.permissions).toEqual({
      edit: false,
      priority: true,
      delete: false,
      comment: true,
      nextStatuses: ["IN_PROGRESS", "CLOSED"],
    });
  });

  it("locks the owner permissions after the ticket leaves OPEN", async () => {
    const t = await createTicket(alice.user.id, { status: "RESOLVED" });
    const view = (await as(alice).get(`/api/tickets/${t.id}`)).body.data;
    expect(view.permissions).toMatchObject({ edit: false, delete: false, comment: true });
  });
});
