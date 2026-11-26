import type { Request, Response } from "express";
import { sendOk } from "../../lib/respond.ts";
import { parseTicketId } from "../tickets/tickets.schemas.ts";
import type { Actor } from "../tickets/tickets.types.ts";
import { createCommentBody } from "./comments.schemas.ts";
import * as service from "./comments.service.ts";

const actorOf = (req: Request): Actor => req.user as Actor;

export async function list(req: Request, res: Response): Promise<void> {
  const ticketId = parseTicketId(req.params.id);
  sendOk(res, await service.list(actorOf(req), ticketId));
}

export async function create(req: Request, res: Response): Promise<void> {
  const ticketId = parseTicketId(req.params.id);
  const body = createCommentBody.parse(req.body);
  sendOk(res, await service.create(actorOf(req), ticketId, body), undefined, 201);
}
