import { randomUUID } from "node:crypto";
import type { Role } from "../../src/generated/prisma/client.ts";
import { prisma } from "../../src/lib/prisma.ts";
import { hashPassword, signToken } from "../../src/modules/auth/auth.service.ts";
import type { PublicUser } from "../../src/modules/auth/auth.types.ts";

export const TEST_PASSWORD = "Password123!";

export interface TestUser {
  user: PublicUser;
  password: string;
  token: string;
  authHeader: { Authorization: string };
}

export async function createUser(overrides: { role?: Role; name?: string; email?: string } = {}): Promise<TestUser> {
  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `user-${randomUUID()}@example.com`,
      role: overrides.role ?? "USER",
      passwordHash: await hashPassword(TEST_PASSWORD),
    },
    select: { id: true, name: true, email: true, role: true },
  });
  const token = signToken(user.id);
  return { user, password: TEST_PASSWORD, token, authHeader: { Authorization: `Bearer ${token}` } };
}
