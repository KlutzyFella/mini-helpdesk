import { Router } from "express";
import { sendOk } from "./lib/respond.ts";

export function createRouter(): Router {
  const router = Router();
  router.get("/health", (_req, res) => sendOk(res, { status: "ok" }));
  return router;
}
