import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import type { Config } from "../../config/env.ts";
import { errorBody } from "../../lib/respond.ts";
import { authenticate } from "../../middleware/authenticate.ts";
import * as controller from "./auth.controller.ts";

export function createAuthRouter(config: Config): Router {
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: config.AUTH_RATE_LIMIT,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json(errorBody("RATE_LIMITED", "Too many attempts, try again in a minute"));
    },
  });
  const router = Router();
  router.post("/register", limiter, controller.register);
  router.post("/login", limiter, controller.login);
  router.get("/me", authenticate, controller.me);
  return router;
}
