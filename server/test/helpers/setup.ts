import { afterAll, beforeEach } from "vitest";
import { prisma } from "../../src/lib/prisma.ts";
import { truncateAll } from "./db.ts";

beforeEach(truncateAll);
afterAll(() => prisma.$disconnect());
