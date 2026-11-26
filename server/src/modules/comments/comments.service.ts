import { publish } from "../../events/bus.ts";
import { AppError } from "../../lib/errors.ts";
import { prisma } from "../../lib/prisma.ts";
import { canComment } from "../tickets/tickets.rules.ts";
import { findVisibleTicket } from "../tickets/tickets.service.ts";
import type { Actor } from "../tickets/tickets.types.ts";
import type { CreateCommentBody } from "./comments.schemas.ts";
import type { CommentView } from "./comments.types.ts";

const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
} as const;

export async function list(actor: Actor, ticketId: string): Promise<CommentView[]> {
  await findVisibleTicket(actor, ticketId);
  return prisma.comment.findMany({
    where: { ticketId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: commentSelect,
  });
}

export async function create(actor: Actor, ticketId: string, input: CreateCommentBody): Promise<CommentView> {
  const ticket = await findVisibleTicket(actor, ticketId);
  if (!canComment(ticket)) throw new AppError("TICKET_CLOSED", "Comments are closed on a CLOSED ticket");
  const comment = await prisma.comment.create({
    data: { ticketId, authorId: actor.id, body: input.body },
    select: commentSelect,
  });
  await publish([{ type: "COMMENT_ADDED", ticketId, actorId: actor.id, commentId: comment.id }]);
  return comment;
}
