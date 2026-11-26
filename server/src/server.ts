import { createApp } from "./app.ts";
import { config } from "./config/env.ts";
import { logger } from "./lib/logger.ts";

createApp(config).listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "server listening");
});
