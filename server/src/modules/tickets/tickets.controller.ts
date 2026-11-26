import type { Request, Response } from "express";
import { sendOk } from "../../lib/respond.ts";
import { adminPatchBody, createBody, listQuery, ownerPatchBody, parseTicketId } from "./tickets.schemas.ts";
import * as service from "./tickets.service.ts";
import type { Actor } from "./tickets.types.ts";

const actorOf = (req: Request): Actor => req.user as Actor;

export async function list(req: Request, res: Response): Promise<void> {
  const query = listQuery.parse(req.query);
  const { items, meta } = await service.list(actorOf(req), query);
  sendOk(res, items, meta);
}

export async function get(req: Request, res: Response): Promise<void> {
  const id = parseTicketId(req.params.id);
  sendOk(res, await service.get(actorOf(req), id));
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = createBody.parse(req.body);
  sendOk(res, await service.create(actorOf(req), body), undefined, 201);
}

export async function ownerUpdate(req: Request, res: Response): Promise<void> {
  const id = parseTicketId(req.params.id);
  const body = ownerPatchBody.parse(req.body);
  sendOk(res, await service.ownerUpdate(actorOf(req), id, body));
}

export async function adminUpdate(req: Request, res: Response): Promise<void> {
  const id = parseTicketId(req.params.id);
  const body = adminPatchBody.parse(req.body);
  sendOk(res, await service.adminUpdate(actorOf(req), id, body));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseTicketId(req.params.id);
  await service.remove(actorOf(req), id);
  res.status(204).end();
}
