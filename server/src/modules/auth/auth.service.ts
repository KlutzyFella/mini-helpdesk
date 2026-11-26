import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../../config/env.ts";
import { Prisma } from "../../generated/prisma/client.ts";
import { AppError } from "../../lib/errors.ts";
import { prisma } from "../../lib/prisma.ts";
import type { LoginBody, RegisterBody } from "./auth.schemas.ts";
import type { AuthResult, PublicUser } from "./auth.types.ts";

const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", config.BCRYPT_ROUNDS);

const PUBLIC_USER_SELECT = { id: true, name: true, email: true, role: true } as const;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.BCRYPT_ROUNDS);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: config.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export async function register(input: RegisterBody): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: PUBLIC_USER_SELECT,
    });
    return { token: signToken(user.id), user };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError("EMAIL_TAKEN", "Email is already registered", [
        { field: "email", message: "Email is already registered" },
      ]);
    }
    throw err;
  }
}

export async function login(input: LoginBody): Promise<AuthResult> {
  const found = await prisma.user.findUnique({
    where: { email: input.email },
    omit: { passwordHash: false },
  });
  const matches = await bcrypt.compare(input.password, found?.passwordHash ?? DUMMY_HASH);
  if (!found || !matches) throw new AppError("INVALID_CREDENTIALS", "Invalid email or password");
  const user: PublicUser = { id: found.id, name: found.name, email: found.email, role: found.role };
  return { token: signToken(user.id), user };
}
