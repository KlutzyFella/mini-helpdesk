import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.ts";
import { AppError } from "../lib/errors.ts";
import { prisma } from "../lib/prisma.ts";

const BEARER = /^Bearer (\S+)$/;

function unauthenticated(): AppError {
  return new AppError("UNAUTHENTICATED", "Authentication required");
}

function subjectOf(header: string | undefined): string {
  const token = header?.match(BEARER)?.[1];
  if (!token) throw unauthenticated();
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload === "object" && typeof payload.sub === "string") return payload.sub;
  } catch {
    // any verify failure is the same 401
  }
  throw unauthenticated();
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: subjectOf(req.headers.authorization) },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw unauthenticated();
  req.user = user;
  next();
}
