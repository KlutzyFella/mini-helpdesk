import { z } from "zod";

export const createCommentBody = z.strictObject({ body: z.string().trim().min(1).max(2000) });

export type CreateCommentBody = z.infer<typeof createCommentBody>;
