import "dotenv/config";
import { SignJWT } from "jose";
import type { Page, BrowserContext } from "@playwright/test";

/**
 * JWT signing secret resolved exactly like the server
 * (`server/_core/sdk.ts#getSessionSecret`):
 *   process.env.JWT_SECRET || "landsphere-demo-jwt-secret-min-32-chars-long"
 *
 * The server reads `JWT_SECRET` from `.env` via `dotenv/config`, so the helper
 * loads the same file. Hard-coding only the fallback would produce tokens the
 * server rejects (`JWSSignatureVerificationFailed`) whenever `.env` defines a
 * secret, silently running the E2E suite unauthenticated.
 */
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "landsphere-demo-jwt-secret-min-32-chars-long"
);

const COOKIE_NAME = "app_session_id";

interface TokenOptions {
  openId: string;
  name: string;
  role: string;
  citizenId?: string;
}

/**
 * Create a JWT token compatible with the LandSphere server-side
 * `sdk.verifySession()`.
 */
export async function createToken(opts: TokenOptions): Promise<string> {
  const claims: Record<string, unknown> = {
    openId: opts.openId,
    appId: "landsphere-ai",
    name: opts.name,
    role: opts.role,
  };
  if (opts.citizenId) claims.citizenId = opts.citizenId;

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600) // 1 hour
    .sign(JWT_SECRET);
}

/** Pre-built token factories for the two canonical demo roles. */
export async function governmentToken(): Promise<string> {
  return createToken({
    openId: "GOV-DEMO-01",
    name: "A. Officer",
    role: "government",
  });
}

export async function citizenToken(): Promise<string> {
  return createToken({
    openId: "CIT-DEMO-001",
    name: "Demo Citizen",
    role: "citizen",
    citizenId: "CIT-DEMO-001",
  });
}

/**
 * Inject a valid session cookie into the browser context so subsequent
 * navigation is authenticated for API calls.
 */
export async function authenticateContext(
  context: BrowserContext,
  token: string,
  baseURL: string
): Promise<void> {
  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      // Chrome drops `SameSite=None` cookies unless they are `Secure`, which
      // would silently drop this test session on http://localhost. Lax keeps
      // the cookie while still being sent on same-site navigations/fetches.
      sameSite: "Lax",
      secure: false, // localhost
    },
  ]);
}

/**
 * Helper: authenticate a page's context with a role and navigate to a URL.
 */
export async function authenticateAndGo(
  page: Page,
  role: "government" | "citizen",
  path: string,
  baseURL: string
): Promise<void> {
  const token =
    role === "government" ? await governmentToken() : await citizenToken();
  await authenticateContext(page.context(), token, baseURL);
  await page.goto(path, { waitUntil: "networkidle" });
}
