import { logger } from "../lib/logger.ts";
import { recordActivity } from "./subscribers/recordActivity.ts";
import { sendNotifications } from "./subscribers/sendNotifications.ts";
import type { DomainEvent } from "./types.ts";

export type Subscriber = (e: DomainEvent) => Promise<void>;

export const subscribers: Subscriber[] = [recordActivity, sendNotifications];

export async function publish(events: DomainEvent[]): Promise<void> {
  for (const e of events)
    for (const s of subscribers) {
      try {
        await s(e);
      } catch (err) {
        logger.error({ err, type: e.type }, "subscriber failed");
      }
    }
}
