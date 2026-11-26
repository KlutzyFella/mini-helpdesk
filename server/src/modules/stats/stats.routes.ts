import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.ts";
import { authorize } from "../../middleware/authorize.ts";
import * as controller from "./stats.controller.ts";

export function createStatsRouter(): Router {
  const router = Router();
  router.get("/admin/stats", authenticate, authorize("ADMIN"), controller.get);
  return router;
}
