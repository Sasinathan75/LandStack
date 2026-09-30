// server/security/validation.ts
// Lightweight input validation utilities for API parameters and request bodies.

import type { Response } from "express";
import { securityConfig } from "./config";

export function sendValidationError(res: Response, message: string): void {
  res.status(400).json({
    success: false,
    error: "VALIDATION_ERROR",
    message,
  });
}

/**
 * Validates that an identifier (parcelId, requestId, reportId, etc.)
 * is a non-empty string within safe length bounds and without path-traversal characters.
 */
export function isValidId(id: unknown, maxLength: number = securityConfig.validation.maxIdLength): id is string {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return false;
  // Disallow path traversal sequences
  if (trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) return false;
  return true;
}

/**
 * Validates a text field length.
 */
export function isValidText(
  value: unknown,
  required = true,
  maxLength: number = securityConfig.validation.maxTextLength
): boolean {
  if (value === undefined || value === null) return !required;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (required && trimmed.length === 0) return false;
  return trimmed.length <= maxLength;
}
