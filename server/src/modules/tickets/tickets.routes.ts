import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.ts";
import { authorize } from "../../middleware/authorize.ts";
import * as controller from "./tickets.controller.ts";

export function createTicketsRouter(): Router {
  const router = Router();
  router.get("/tickets", authenticate, controller.list);
  router.get("/tickets/:id", authenticate, controller.get);
  router.post("/tickets", authenticate, authorize("USER"), controller.create);
  router.patch("/tickets/:id", authenticate, authorize("USER"), controller.ownerUpdate);
  router.delete("/tickets/:id", authenticate, authorize("USER"), controller.remove);
  router.patch("/admin/tickets/:id", authenticate, authorize("ADMIN"), controller.adminUpdate);
  return router;
}
