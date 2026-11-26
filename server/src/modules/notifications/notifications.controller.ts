import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/errors.ts";
import { sendOk } from "../../lib/respond.ts";
import type { Actor } from "../tickets/tickets.types.ts";
import { readAllBody } from "./notifications.schemas.ts";
import * as service from "./notifications.service.ts";

export async function list(req: Request, res: Response): Promise<void> {
  const { items, unreadCount } = await service.list(req.user as Actor);
  sendOk(res, items, { unreadCount });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) throw new AppError("NOT_FOUND", "Notification not found");
  sendOk(res, await service.markRead(req.user as Actor, id.data));
}

export async function readAll(req: Request, res: Response): Promise<void> {
  const { before } = readAllBody.parse(req.body);
  sendOk(res, { updated: await service.readAll(req.user as Actor, new Date(before)) });
}
