import type { Role } from "../../generated/prisma/enums.ts";

export interface CommentView {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; name: string; role: Role };
}
