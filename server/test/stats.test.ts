import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { config } from "../src/config/env.ts";
import { createTicket } from "./helpers/tickets.ts";
import { createUser, type TestUser } from "./helpers/users.ts";

const app = createApp(config);
const HOUR = 3_600_000;
const T0 = new Date("2026-01-01T00:00:00Z");
const at = (hours: number) => new Date(T0.getTime() + hours * HOUR);

let alice: TestUser;
let admin: TestUser;

beforeEach(async () => {
  alice = await createUser({ name: "Alice" });
  admin = await createUser({ role: "ADMIN", name: "Admin" });
});

const stats = (u: TestUser) => request(app).get("/api/admin/stats").set(u.authHeader);

describe("GET /api/admin/stats", () => {
  it("gives a USER 403 and no token 401", async () => {
    expect((await stats(alice)).status).toBe(403);
    expect((await request(app).get("/api/admin/stats")).status).toBe(401);
  });

  it("returns zeroed counts and a null average when there are no tickets", async () => {
    const res = await stats(admin);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      total: 0,
      byStatus: { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 },
      byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
      byCategory: { BUG: 0, BILLING: 0, ACCOUNT: 0, FEATURE_REQUEST: 0, OTHER: 0 },
      avgResolutionHours: null,
    });
  });

  it("counts every ticket and averages only the resolved ones", async () => {
    const id = alice.user.id;
    await createTicket(id, { status: "OPEN", priority: "HIGH", category: "BUG" });
    await createTicket(id, { status: "IN_PROGRESS", priority: "LOW", category: "BILLING" });
    await createTicket(id, { status: "RESOLVED", priority: "URGENT", category: "BUG", createdAt: T0, resolvedAt: at(2) });
    await createTicket(id, { status: "CLOSED", priority: "MEDIUM", category: "ACCOUNT", createdAt: T0, resolvedAt: at(7) });
    await createTicket(id, { status: "CLOSED", priority: "MEDIUM", category: "OTHER", resolvedAt: null });

    const res = await stats(admin);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      total: 5,
      byStatus: { OPEN: 1, IN_PROGRESS: 1, RESOLVED: 1, CLOSED: 2 },
      byPriority: { LOW: 1, MEDIUM: 2, HIGH: 1, URGENT: 1 },
      byCategory: { BUG: 2, BILLING: 1, ACCOUNT: 1, FEATURE_REQUEST: 0, OTHER: 1 },
      avgResolutionHours: 4.5,
    });
  });

  it("keeps a ticket that was resolved and then closed in the average", async () => {
    const created = await request(app)
      .post("/api/tickets")
      .set(alice.authHeader)
      .send({ title: "Printer is on fire", description: "Smoke everywhere.", category: "BUG" });
    const path = `/api/admin/tickets/${created.body.data.id}`;
    for (const status of ["IN_PROGRESS", "RESOLVED", "CLOSED"]) {
      expect((await request(app).patch(path).set(admin.authHeader).send({ status })).status).toBe(200);
    }

    const { data } = (await stats(admin)).body;
    expect(data.byStatus.CLOSED).toBe(1);
    expect(data.avgResolutionHours).toBeTypeOf("number");
    expect(data.avgResolutionHours).toBeGreaterThanOrEqual(0);
  });
});
