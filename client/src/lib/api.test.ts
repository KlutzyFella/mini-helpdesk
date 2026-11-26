import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, onUnauthorized, setToken } from "./api";

const unauthorized = () =>
  new Response(
    JSON.stringify({ success: false, data: null, error: { code: "UNAUTHENTICATED", message: "no" } }),
    { status: 401 },
  );

describe("apiFetch 401 handling", () => {
  const handler = vi.fn();

  beforeEach(() => {
    handler.mockClear();
    onUnauthorized(handler);
    vi.stubGlobal("fetch", vi.fn(async () => unauthorized()));
  });

  afterEach(() => {
    setToken(null);
    onUnauthorized(null);
    vi.unstubAllGlobals();
  });

  it("does not call onUnauthorized when the request sent no token", async () => {
    await expect(apiFetch("/api/auth/login", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls onUnauthorized when the request sent a token", async () => {
    setToken("abc");
    await expect(apiFetch("/api/auth/me")).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
