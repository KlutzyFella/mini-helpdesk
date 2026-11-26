import type { Request, Response } from "express";
import { sendOk } from "../../lib/respond.ts";
import { parseTicketId } from "../tickets/tickets.schemas.ts";
import type { Actor } from "../tickets/tickets.types.ts";
import * as service from "./activity.service.ts";

export async function list(req: Request, res: Response): Promise<void> {
  const ticketId = parseTicketId(req.params.id);
  sendOk(res, await service.listForTicket(req.user as Actor, ticketId));
}
