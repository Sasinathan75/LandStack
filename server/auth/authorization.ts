import type { NextFunction, Request, Response } from "express";
import { sdk, type AuthenticatedUser, deriveNormalizedRole } from "../_core/sdk";

import { auditService } from "../audit/auditService";

export type PortalRoleName = "CITIZEN" | "GOVERNMENT" | "ADMIN";

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  authRole: PortalRoleName;
  citizenId?: string;
}

export interface AuthErrorResponse {
  success: false;
  error: "UNAUTHORIZED" | "FORBIDDEN";
  message: string;
}

/**
 * Standard 401 Unauthorized response envelope.
 */
export function sendUnauthorized(
  res: Response,
  message = "Authentication required"
): Response<AuthErrorResponse> {
  auditService.recordEvent({
    actor: "Anonymous",
    role: "system",
    action: "Authentication Failure: 401 Unauthorized",
    entityType: "Request",
    entityId: "AUTH",
    status: "DENIED",
    details: message,
  });
  return res.status(401).json({
    success: false,
    error: "UNAUTHORIZED",
    message,
  });
}

/**
 * Standard 403 Forbidden response envelope.
 */
export function sendForbidden(
  res: Response,
  message = "You do not have permission to access this resource",
  actor = "Unknown"
): Response<AuthErrorResponse> {
  auditService.recordEvent({
    actor,
    role: "system",
    action: "Authorization Failure: 403 Forbidden",
    entityType: "Request",
    entityId: "AUTH",
    status: "DENIED",
    details: message,
  });
  return res.status(403).json({
    success: false,
    error: "FORBIDDEN",
    message,
  });
}

/**
 * Express middleware: Verifies that the request is authenticated with a valid session.
 * Rejects unauthenticated API requests with HTTP 401 and the standard error envelope.
 * Strictly ignores any role or identity passed in req.body, req.query, or client headers.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      sendUnauthorized(res);
      return;
    }

    const authRole = user.roleNormalized ?? deriveNormalizedRole(user.role);
    (req as AuthenticatedRequest).user = user;
    (req as AuthenticatedRequest).authRole = authRole;
    (req as AuthenticatedRequest).citizenId = user.citizenId;

    next();
  } catch (error) {
    sendUnauthorized(res);
  }
}

/**
 * Express middleware: Requires an authenticated user and verifies that their
 * server-verified role matches one of the allowed roles.
 *
 * If unauthenticated -> HTTP 401
 * If authenticated but role not allowed -> HTTP 403
 *
 * Privilege escalation prevention:
 * The role used for authorization ALWAYS comes from the verified server-side identity,
 * never from req.body.role or req.query.role.
 */
export function requireRole(...allowedRoles: string[]) {
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      try {
        const user = await sdk.authenticateRequest(req);
        if (!user) {
          sendUnauthorized(res);
          return;
        }
        const authRole = user.roleNormalized ?? deriveNormalizedRole(user.role);
        authReq.user = user;
        authReq.authRole = authRole;
        authReq.citizenId = user.citizenId;
      } catch (error) {
        sendUnauthorized(res);
        return;
      }
    }

    const userRole = (authReq.authRole || "CITIZEN").toUpperCase();

    // ADMIN has supervisor access across portals; otherwise must match allowed roles
    const isAllowed = userRole === "ADMIN" || normalizedAllowed.includes(userRole);

    if (!isAllowed) {
      sendForbidden(
        res,
        undefined,
        authReq.user?.name || authReq.user?.openId || "Authenticated User"
      );
      return;
    }

    next();
  };
}

/** Convenience middleware for Citizen-only endpoints */
export const requireCitizen = requireRole("CITIZEN");

/** Convenience middleware for Government-only endpoints */
export const requireGovernment = requireRole("GOVERNMENT");

/**
 * Checks whether an authenticated user is permitted to access a citizen resource.
 * - Government officers / Admins can access all records according to governance workflow rules.
 * - Citizens can ONLY access records belonging to their own citizenId.
 */
export function isResourceOwnerOrGovernment(
  user: AuthenticatedUser,
  resourceCitizenId: string | null | undefined
): boolean {
  const role = (user.roleNormalized ?? deriveNormalizedRole(user.role)).toUpperCase();
  if (role === "GOVERNMENT" || role === "ADMIN") {
    return true;
  }
  if (!user.citizenId || !resourceCitizenId) {
    return false;
  }
  return user.citizenId.toLowerCase() === resourceCitizenId.toLowerCase();
}

/**
 * Helper to generate a signed session token with role and optional citizenId for testing.
 */
export async function createAuthToken(user: {
  openId: string;
  name?: string;
  role?: string;
  citizenId?: string;
  expiresInMs?: number;
}): Promise<string> {
  return sdk.createSessionToken(user.openId, {
    name: user.name || user.openId,
    role: user.role,
    citizenId: user.citizenId,
    expiresInMs: user.expiresInMs,
  });
}
