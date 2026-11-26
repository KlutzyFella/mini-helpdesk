import type { Request, Response } from "express";
import { AppError } from "../lib/errors.ts";

export function notFound(req: Request, _res: Response): never {
  throw new AppError("NOT_FOUND", `Route ${req.method} ${req.path} not found`);
}
