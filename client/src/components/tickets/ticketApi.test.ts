import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteTicket } from "./ticketApi";

afterEach(() => vi.unstubAllGlobals());

describe("deleteTicket", () => {
  it("treats the API's empty 204 as success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    await expect(deleteTicket("t1")).resolves.toBeUndefined();
  });

  it("still throws on a real error", async () => {
    const body = { success: false, data: null, error: { code: "TICKET_LOCKED", message: "locked" } };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 409 })));
    await expect(deleteTicket("t1")).rejects.toMatchObject({ status: 409, code: "TICKET_LOCKED" });
  });
});
