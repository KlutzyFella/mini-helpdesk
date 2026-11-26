import { z } from "zod";
import { AppError } from "../../lib/errors.ts";
import { TicketCategory, TicketPriority, TicketStatus } from "../../generated/prisma/enums.ts";

const category = z.enum(TicketCategory);
const priority = z.enum(TicketPriority);
const status = z.enum(TicketStatus);

const atLeastOneKey = (v: object) => Object.keys(v).length > 0;
const atLeastOneMessage = "Provide at least one field to change";

export function parseTicketId(raw: unknown): string {
  const parsed = z.uuid().safeParse(raw);
  if (!parsed.success) throw new AppError("NOT_FOUND", "Ticket not found");
  return parsed.data;
}

export const createBody = z.strictObject({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  category,
  priority: priority.optional(),
});

export const ownerPatchBody = z
  .strictObject({
    title: createBody.shape.title.optional(),
    description: createBody.shape.description.optional(),
    category: category.optional(),
  })
  .refine(atLeastOneKey, atLeastOneMessage);

export const adminPatchBody = z
  .strictObject({ status: status.optional(), priority: priority.optional() })
  .refine(atLeastOneKey, atLeastOneMessage);

export const listQuery = z.object({
  status: status.optional(),
  priority: priority.optional(),
  category: category.optional(),
  search: z
    .string()
    .trim()
    .max(100)
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  sort: z.enum(["createdAt", "updatedAt", "priority"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateBody = z.infer<typeof createBody>;
export type OwnerPatchBody = z.infer<typeof ownerPatchBody>;
export type AdminPatchBody = z.infer<typeof adminPatchBody>;
export type ListQuery = z.infer<typeof listQuery>;
