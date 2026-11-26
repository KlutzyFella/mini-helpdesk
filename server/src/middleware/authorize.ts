import type { NextFunction, Request, Response } from "express";
import type { Role } from "../generated/prisma/client.ts";
import { AppError } from "../lib/errors.ts";

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("FORBIDDEN", "You do not have permission to do this");
    }
    next();
  };
}
