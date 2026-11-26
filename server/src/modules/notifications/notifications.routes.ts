import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.ts";
import * as controller from "./notifications.controller.ts";

export function createNotificationsRouter(): Router {
  const router = Router();
  router.get("/notifications", authenticate, controller.list);
  router.patch("/notifications/:id/read", authenticate, controller.markRead);
  return router;
}
