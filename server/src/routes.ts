import { Router } from "express";
import type { Config } from "./config/env.ts";
import { sendOk } from "./lib/respond.ts";
import { createActivityRouter } from "./modules/activity/activity.routes.ts";
import { createAuthRouter } from "./modules/auth/auth.routes.ts";
import { createCommentsRouter } from "./modules/comments/comments.routes.ts";
import { createNotificationsRouter } from "./modules/notifications/notifications.routes.ts";
import { createTicketsRouter } from "./modules/tickets/tickets.routes.ts";

export function createRouter(config: Config): Router {
  const router = Router();
  router.get("/health", (_req, res) => sendOk(res, { status: "ok" }));
  router.use("/api/auth", createAuthRouter(config));
  router.use("/api", createTicketsRouter());
  router.use("/api", createCommentsRouter());
  router.use("/api", createActivityRouter());
  router.use("/api", createNotificationsRouter());
  return router;
}
