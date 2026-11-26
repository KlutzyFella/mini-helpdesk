import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.ts";
import * as controller from "./activity.controller.ts";

export function createActivityRouter(): Router {
  const router = Router();
  router.get("/tickets/:id/activity", authenticate, controller.list);
  return router;
}
