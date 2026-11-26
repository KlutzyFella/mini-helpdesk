import { prisma } from "../../src/lib/prisma.ts";

const TABLES = ["notifications", "activity_logs", "comments", "tickets", "users"];

export async function truncateAll(): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
}
