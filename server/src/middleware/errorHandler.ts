import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.ts";
import { AppError, STATUS_BY_CODE, type ErrorCode, type ErrorDetail } from "../lib/errors.ts";
import { logger } from "../lib/logger.ts";
import { errorBody } from "../lib/respond.ts";

interface Mapped {
  code: ErrorCode;
  message: string;
  details?: ErrorDetail[];
}

const INTERNAL_MESSAGE = "Internal server error";

const PRISMA_CODES: Record<string, Mapped> = {
  P2002: { code: "CONFLICT", message: "Resource already exists" },
  P2025: { code: "NOT_FOUND", message: "Resource not found" },
};

const BODY_PARSER_TYPES: Record<string, Mapped> = {
  "entity.parse.failed": { code: "INVALID_JSON", message: "Request body is not valid JSON" },
  "entity.too.large": { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" },
};

function map(err: unknown): Mapped | null {
  if (err instanceof AppError) return { code: err.code, message: err.message, details: err.details };
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    return { code: "VALIDATION_ERROR", message: "Validation failed", details };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) return PRISMA_CODES[err.code] ?? null;
  const type = (err as { type?: unknown } | null)?.type;
  return typeof type === "string" ? (BODY_PARSER_TYPES[type] ?? null) : null;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const mapped = map(err);
  if (mapped) {
    res.status(STATUS_BY_CODE[mapped.code]).json(errorBody(mapped.code, mapped.message, mapped.details));
    return;
  }
  logger.error({ err, reqId: req.id }, "unhandled error");
  res
    .status(STATUS_BY_CODE.INTERNAL_ERROR)
    .json(errorBody("INTERNAL_ERROR", INTERNAL_MESSAGE, undefined, String(req.id)));
};
