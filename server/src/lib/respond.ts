import type { Response } from "express";
import type { ErrorCode, ErrorDetail } from "./errors.ts";

export type Meta = Record<string, unknown>;

export interface ErrorBody {
  success: false;
  data: null;
  error: { code: ErrorCode; message: string; details?: ErrorDetail[]; requestId?: string };
}

export function sendOk<T>(res: Response, data: T, meta?: Meta, status = 200): void {
  res.status(status).json({ success: true, data, error: null, meta: meta ?? null });
}

export function errorBody(
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[],
  requestId?: string,
): ErrorBody {
  return {
    success: false,
    data: null,
    error: { code, message, ...(details && { details }), ...(requestId && { requestId }) },
  };
}
