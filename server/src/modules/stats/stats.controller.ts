import type { Request, Response } from "express";
import { sendOk } from "../../lib/respond.ts";
import * as service from "./stats.service.ts";

export async function get(_req: Request, res: Response): Promise<void> {
  sendOk(res, await service.get());
}
