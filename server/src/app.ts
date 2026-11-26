import { randomUUID } from "node:crypto";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { Config } from "./config/env.ts";
import { logger } from "./lib/logger.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import { notFound } from "./middleware/notFound.ts";
import { createRouter } from "./routes.ts";

export function createApp(config: Config, mountExtra?: (app: Express) => void): Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(pinoHttp({ logger, genReqId: () => randomUUID() }));
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGINS }));
  app.use(express.json({ limit: "100kb" }));
  app.use(createRouter(config));
  mountExtra?.(app);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
