// server/security/rateLimiter.ts
// In-memory deterministic rate limiting middleware for LandSphere AI.

import type { Request, Response, NextFunction } from "express";
import { securityConfig } from "./config";
import type { AuthenticatedRequest } from "../auth/authorization";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export class RateLimiter {
  private hits: Map<string, RateLimitRecord> = new Map();
  private windowMs: number;
  private max: number;
  private message: string;
  private keyGenerator: (req: Request) => string;

  constructor(options: RateLimitOptions = {}) {
    this.windowMs = options.windowMs ?? securityConfig.rateLimit.windowMs;
    this.max = options.max ?? securityConfig.rateLimit.maxSensitiveRequests;
    this.message =
      options.message ??
      "Too many requests. Please try again later.";
    this.keyGenerator =
      options.keyGenerator ??
      ((req: Request) => {
        const authReq = req as AuthenticatedRequest;
        const identity = authReq.user?.openId || req.ip || "127.0.0.1";
        return `${req.baseUrl || ""}${req.path}:${identity}`;
      });
  }

  public getMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!securityConfig.rateLimit.enabled) {
        next();
        return;
      }

      const key = this.keyGenerator(req);
      const now = Date.now();
      const existing = this.hits.get(key);

      if (!existing || now > existing.resetTime) {
        this.hits.set(key, {
          count: 1,
          resetTime: now + this.windowMs,
        });
        next();
        return;
      }

      existing.count += 1;

      if (existing.count > this.max) {
        const retryAfterSeconds = Math.ceil(
          Math.max(0, existing.resetTime - now) / 1000
        );
        res.setHeader("Retry-After", String(retryAfterSeconds));
        res.status(429).json({
          success: false,
          error: "RATE_LIMITED",
          message: this.message,
        });
        return;
      }

      next();
    };
  }

  public reset(): void {
    this.hits.clear();
  }

  public setLimit(max: number, windowMs?: number): void {
    this.max = max;
    if (windowMs) this.windowMs = windowMs;
  }
}

/** Pre-configured rate limiter for sensitive operations (reports, AI validation, satellite, requests) */
export const sensitiveRateLimiter = new RateLimiter({
  max: securityConfig.rateLimit.maxSensitiveRequests,
  windowMs: securityConfig.rateLimit.windowMs,
});
