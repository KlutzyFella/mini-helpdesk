import { z } from "zod";

export const readAllBody = z.strictObject({ before: z.iso.datetime({ offset: true }) });
