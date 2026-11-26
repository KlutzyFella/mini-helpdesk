import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.ts";
import { config } from "../src/config/env.ts";
import { prisma } from "../src/lib/prisma.ts";
import { createTicket } from "./helpers/tickets.ts";
import { createUser } from "./helpers/users.ts";

function holdWritesUntilBothArrive(parties: number): () => void {
  const original = prisma.ticket.updateMany.bind(prisma.ticket);
  let arrived = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const spy = vi.spyOn(prisma.ticket, "updateMany").mockImplementation(((args: never) => {
    if (++arrived === parties) release();
    return gate.then(() => original(args));
  }) as never);
  return () => spy.mockRestore();
}

describe("concurrent admin moves", () => {
  it("lets exactly one of two simultaneous moves win", async () => {
    const app = createApp(config);
    const [owner, admin] = [await createUser(), await createUser({ role: "ADMIN" })];
    const ticket = await createTicket(owner.user.id, { status: "IN_PROGRESS" });
    const move = (status: string) =>
      request(app).patch(`/api/admin/tickets/${ticket.id}`).set(admin.authHeader).send({ status });

    const restore = holdWritesUntilBothArrive(2);
    const results = await Promise.all([move("RESOLVED"), move("OPEN")]).finally(restore);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const loser = results.find((r) => r.status === 409);
    expect(loser?.body.error.code).toBe("CONCURRENT_UPDATE");
    const final = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    const winner = results.find((r) => r.status === 200);
    expect(["RESOLVED", "OPEN"]).toContain(final.status);
    expect(final.status).toBe(winner?.body.data.status);
  });
});
