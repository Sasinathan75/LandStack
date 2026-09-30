// server/security/headers.ts
// Express middleware for security headers and cache control.

import type { Request, Response, NextFunction } from "express";
import { securityConfig } from "./config";

export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", securityConfig.headers.contentTypeOptions);

  // Clickjacking protection: frame only from same origin
  res.setHeader("X-Frame-Options", securityConfig.headers.frameOptions);

  // Referrer policy: send origin only on cross-origin requests
  res.setHeader("Referrer-Policy", securityConfig.headers.referrerPolicy);

  // Modern browser XSS auditor handling
  res.setHeader("X-XSS-Protection", "0");

  // Prevent browser caching for sensitive API responses
  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", securityConfig.headers.cacheControlSensitive);
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  next();
}
