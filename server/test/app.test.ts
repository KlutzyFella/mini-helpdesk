import { randomUUID } from "node:crypto";
import request from "supertest";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { config } from "../src/config/env.ts";
import { AppError } from "../src/lib/errors.ts";
import { prisma } from "../src/lib/prisma.ts";
const buildApp = () => createApp(config);

describe("app scaffold", () => {
  it("serves /health with the envelope", async () => {
    const res = await request(buildApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: "ok" }, error: null, meta: null });
  });

  it("returns 404 NOT_FOUND in the envelope for an unknown route", async () => {
    const res = await request(buildApp()).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, data: null, error: { code: "NOT_FOUND" } });
  });

  it("returns 400 INVALID_JSON for a malformed body", async () => {
    const res = await request(buildApp())
      .post("/anything")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("returns 413 PAYLOAD_TOO_LARGE for a 101 kb body", async () => {
    const res = await request(buildApp())
      .post("/anything")
      .send({ blob: "x".repeat(101 * 1024) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("returns 500 with the request id and no stack when a route throws", async () => {
    const app = createApp(config, (a) => {
      a.get("/boom", async () => {
        throw new Error("secret internal detail");
      });
    });
    const res = await request(app).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatchObject({ code: "INTERNAL_ERROR", message: "Internal server error" });
    expect(res.body.error.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(res.body)).not.toMatch(/secret internal detail|stack|\.ts/);
  });

  it("maps ZodError to 400 VALIDATION_ERROR with field details", async () => {
    const app = createApp(config, (a) => {
      a.get("/zod", () => {
        z.strictObject({ name: z.string() }).parse({});
      });
    });
    const res = await request(app).get("/zod");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual([{ field: "name", message: expect.any(String) }]);
  });

  it("keeps the code and status of an AppError", async () => {
    const app = createApp(config, (a) => {
      a.get("/locked", () => {
        throw new AppError("TICKET_LOCKED", "locked");
      });
    });
    const res = await request(app).get("/locked");
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: "TICKET_LOCKED", message: "locked" });
  });

  it("maps a unique-constraint violation to 409 CONFLICT", async () => {
    const app = createApp(config, (a) => {
      a.get("/dup", async () => {
        const data = { name: "A", email: "a@example.com", passwordHash: "x" };
        await prisma.user.create({ data });
        await prisma.user.create({ data });
      });
    });
    const res = await request(app).get("/dup");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("maps a missing-record error to 404 NOT_FOUND", async () => {
    const app = createApp(config, (a) => {
      a.get("/missing", async () => {
        await prisma.user.update({ where: { id: randomUUID() }, data: { name: "B" } });
      });
    });
    const res = await request(app).get("/missing");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
