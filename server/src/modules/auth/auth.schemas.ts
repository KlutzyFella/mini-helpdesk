import { z } from "zod";

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "Password must be at most 72 bytes");

const name = z.string().trim().min(1).max(80);

export const registerBody = z.strictObject({ name, email, password });
export const loginBody = z.strictObject({ email, password });

export type RegisterBody = z.infer<typeof registerBody>;
export type LoginBody = z.infer<typeof loginBody>;
