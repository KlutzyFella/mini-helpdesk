import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { config } from "../config/env.ts";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
  omit: { user: { passwordHash: true } },
});
