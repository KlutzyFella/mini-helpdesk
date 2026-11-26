import type { Role } from "../../generated/prisma/client.ts";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}
