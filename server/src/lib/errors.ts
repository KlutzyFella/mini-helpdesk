export const STATUS_BY_CODE = {
  VALIDATION_ERROR: 400,
  INVALID_JSON: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  TICKET_LOCKED: 409,
  INVALID_TRANSITION: 409,
  TICKET_CLOSED: 409,
  CONCURRENT_UPDATE: 409,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof STATUS_BY_CODE;

export interface ErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS_BY_CODE[code];
  }
}
