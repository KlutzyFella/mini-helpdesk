import type { Request, Response } from "express";
import { sendOk } from "../../lib/respond.ts";
import { loginBody, registerBody } from "./auth.schemas.ts";
import * as service from "./auth.service.ts";

export async function register(req: Request, res: Response): Promise<void> {
  const body = registerBody.parse(req.body);
  sendOk(res, await service.register(body), undefined, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = loginBody.parse(req.body);
  sendOk(res, await service.login(body));
}

export function me(req: Request, res: Response): void {
  sendOk(res, req.user);
}
