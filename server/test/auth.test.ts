import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { config } from "../src/config/env.ts";
import { prisma } from "../src/lib/prisma.ts";
import { authenticate } from "../src/middleware/authenticate.ts";
import { authorize } from "../src/middleware/authorize.ts";
import { sendOk } from "../src/lib/respond.ts";
import { seed } from "../src/scripts/seed.ts";
import { createUser, TEST_PASSWORD } from "./helpers/users.ts";

const buildApp = () => createApp(config);
const valid = { name: "Ada", email: "ada@example.com", password: TEST_PASSWORD };

describe("register", () => {
  it("returns 201 with a token and a public user, never a passwordHash", async () => {
    const res = await request(buildApp()).post("/api/auth/register").send(valid);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      name: "Ada",
      email: "ada@example.com",
      role: "USER",
    });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/i);
  });

  it("returns 409 EMAIL_TAKEN for the same email in a different case, naming email", async () => {
    const app = buildApp();
    await request(app).post("/api/auth/register").send(valid);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...valid, email: "  ADA@Example.COM " });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
    expect(res.body.error.details).toEqual([{ field: "email", message: expect.any(String) }]);
  });

  it("gives exactly one 201 and one 409 for two simultaneous registrations", async () => {
    const app = buildApp();
    const results = await Promise.all([
      request(app).post("/api/auth/register").send(valid),
      request(app).post("/api/auth/register").send(valid),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.user.count()).toBe(1);
  });

  it("rejects a role field with 400", async () => {
    const res = await request(buildApp())
      .post("/api/auth/register")
      .send({ ...valid, role: "ADMIN" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a password over 72 bytes even when it is under 72 characters", async () => {
    const res = await request(buildApp())
      .post("/api/auth/register")
      .send({ ...valid, password: "é".repeat(40) });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0]).toMatchObject({ field: "password", message: expect.stringContaining("72 bytes") });
  });

  it("rejects a short password and a bad email", async () => {
    const app = buildApp();
    const short = await request(app).post("/api/auth/register").send({ ...valid, password: "short" });
    const bad = await request(app).post("/api/auth/register").send({ ...valid, email: "nope" });
    expect(short.status).toBe(400);
    expect(bad.status).toBe(400);
  });
});

describe("login", () => {
  it("returns a token and public user for correct credentials", async () => {
    const { user, password } = await createUser({ email: "login@example.com" });
    const res = await request(buildApp()).post("/api/auth/login").send({ email: "LOGIN@example.com", password });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual(user);
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it("returns the same 401 body for a wrong password and an unknown email", async () => {
    const { user } = await createUser();
    const app = buildApp();
    const wrong = await request(app).post("/api/auth/login").send({ email: user.email, password: "wrong-password" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "ghost@example.com", password: "wrong-password" });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error).toEqual({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" });
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });
});

describe("authenticate and /me", () => {
  it("returns the public user for a valid token", async () => {
    const { user, authHeader } = await createUser();
    const res = await request(buildApp()).get("/api/auth/me").set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(user);
  });

  it("returns 401 UNAUTHENTICATED without a token or with a malformed header", async () => {
    const app = buildApp();
    const none = await request(app).get("/api/auth/me");
    const bad = await request(app).get("/api/auth/me").set("Authorization", "Token abc");
    const junk = await request(app).get("/api/auth/me").set("Authorization", "Bearer not-a-jwt");
    for (const res of [none, bad, junk]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("returns 401 for a token signed with the wrong secret", async () => {
    const { user } = await createUser();
    const token = jwt.sign({ sub: user.id }, "x".repeat(40), { algorithm: "HS256" });
    const res = await request(buildApp()).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 for an expired token", async () => {
    const { user } = await createUser();
    const token = jwt.sign({ sub: user.id }, config.JWT_SECRET, { algorithm: "HS256", expiresIn: -10 });
    const res = await request(buildApp()).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for a token with no sub or an unsigned alg none token", async () => {
    const app = buildApp();
    const noSub = jwt.sign({ foo: "bar" }, config.JWT_SECRET, { algorithm: "HS256" });
    const none = jwt.sign({ sub: "x" }, "", { algorithm: "none" });
    for (const t of [noSub, none]) {
      const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${t}`);
      expect(res.status).toBe(401);
    }
  });

  it("returns 401 for a token whose user was deleted", async () => {
    const { user, authHeader } = await createUser();
    await prisma.user.delete({ where: { id: user.id } });
    const res = await request(buildApp()).get("/api/auth/me").set(authHeader);
    expect(res.status).toBe(401);
  });
});

describe("authorize", () => {
  const appWithAdminRoute = () =>
    createApp(config, (app) => {
      app.get("/admin-only", authenticate, authorize("ADMIN"), (_req, res) => sendOk(res, { ok: true }));
    });

  it("gives 403 FORBIDDEN to a USER and 200 to an ADMIN", async () => {
    const user = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    const app = appWithAdminRoute();
    const denied = await request(app).get("/admin-only").set(user.authHeader);
    const allowed = await request(app).get("/admin-only").set(admin.authHeader);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");
    expect(allowed.status).toBe(200);
  });
});

describe("rate limit", () => {
  it("returns 429 in the envelope on the 4th login and never limits /me", async () => {
    const app = createApp({ ...config, AUTH_RATE_LIMIT: 3 });
    const { user, authHeader } = await createUser();
    const attempt = () => request(app).post("/api/auth/login").send({ email: user.email, password: "wrong-password" });
    for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
    const limited = await attempt();
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ success: false, data: null, error: { code: "RATE_LIMITED" } });
    for (let i = 0; i < 5; i++) {
      expect((await request(app).get("/api/auth/me").set(authHeader)).status).toBe(200);
    }
  });

  it("gives each app its own limiter", async () => {
    const body = { email: "a@example.com", password: "wrong-password" };
    const first = createApp({ ...config, AUTH_RATE_LIMIT: 1 });
    await request(first).post("/api/auth/login").send(body);
    expect((await request(first).post("/api/auth/login").send(body)).status).toBe(429);
    const second = createApp({ ...config, AUTH_RATE_LIMIT: 1 });
    expect((await request(second).post("/api/auth/login").send(body)).status).toBe(401);
  });
});

describe("seed", () => {
  const seedConfig = { ...config, ADMIN_EMAIL: "Root@Example.com", ADMIN_PASSWORD: "admin-password-1" };

  it("is idempotent: one admin, two demo users, sample tickets once", async () => {
    await seed(seedConfig);
    await seed(seedConfig);
    expect(await prisma.user.count({ where: { role: "ADMIN" } })).toBe(1);
    expect(await prisma.user.count({ where: { email: { in: ["alice@example.com", "bob@example.com"] } } })).toBe(2);
    expect(await prisma.ticket.count()).toBe(6);
    const login = await request(buildApp()).post("/api/auth/login").send({ email: "root@example.com", password: "admin-password-1" });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe("ADMIN");
  });

  it("refuses to run without admin credentials", async () => {
    await expect(seed({ ...config, ADMIN_EMAIL: undefined, ADMIN_PASSWORD: undefined })).rejects.toThrow(/ADMIN_EMAIL/);
  });
});
