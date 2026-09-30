// server/security/config.ts
// Centralized security configuration with safe environment-driven defaults.

export interface SecurityConfig {
  jwtSecret: string;
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxGeneralRequests: number;
    maxSensitiveRequests: number;
  };
  headers: {
    frameOptions: "SAMEORIGIN" | "DENY";
    contentTypeOptions: "nosniff";
    referrerPolicy: "strict-origin-when-cross-origin";
    cacheControlSensitive: string;
  };
  validation: {
    maxIdLength: number;
    maxTextLength: number;
    maxCommentLength: number;
  };
}

export const securityConfig: SecurityConfig = {
  jwtSecret:
    process.env.JWT_SECRET ||
    "landsphere-demo-jwt-secret-min-32-chars-long",
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== "false",
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 minute
    maxGeneralRequests: parseInt(
      process.env.RATE_LIMIT_MAX_GENERAL || "200",
      10
    ),
    maxSensitiveRequests: parseInt(
      process.env.RATE_LIMIT_MAX_SENSITIVE || "50",
      10
    ),
  },
  headers: {
    frameOptions: "SAMEORIGIN",
    contentTypeOptions: "nosniff",
    referrerPolicy: "strict-origin-when-cross-origin",
    cacheControlSensitive: "no-store, no-cache, must-revalidate, proxy-revalidate",
  },
  validation: {
    maxIdLength: 64,
    maxTextLength: 255,
    maxCommentLength: 2000,
  },
};
