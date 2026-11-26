import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.ts";
import * as controller from "./comments.controller.ts";

export function createCommentsRouter(): Router {
  const router = Router();
  router.get("/tickets/:id/comments", authenticate, controller.list);
  router.post("/tickets/:id/comments", authenticate, controller.create);
  return router;
}
