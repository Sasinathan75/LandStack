import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "./_core/cookies";

function createRequest(protocol: string, forwardedProto?: string): Request {
  return {
    protocol,
    headers: forwardedProto ? { "x-forwarded-proto": forwardedProto } : {},
  } as unknown as Request;
}

describe("Prompt 12 — Session cookie options", () => {
  it("uses SameSite=Lax over plain HTTP so the cookie is not dropped", () => {
    const options = getSessionCookieOptions(createRequest("http"));

    // `SameSite=None` without `Secure` is rejected by browsers, which silently
    // logged users out on HTTP hosts and forced demo-data fallbacks.
    expect(options).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });

  it("keeps SameSite=None with Secure for HTTPS requests", () => {
    const options = getSessionCookieOptions(createRequest("https"));

    expect(options).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
    });
  });

  it("honours x-forwarded-proto from a TLS-terminating proxy", () => {
    const options = getSessionCookieOptions(createRequest("http", "https"));

    expect(options.sameSite).toBe("none");
    expect(options.secure).toBe(true);
  });

  it("treats a comma-separated forwarded proto list as secure when HTTPS occurs", () => {
    const options = getSessionCookieOptions(createRequest("http", "http, https"));

    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("none");
  });
});
