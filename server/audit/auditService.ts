// server/audit/auditService.ts
// Centralized, append-only, sanitized audit logging service for LandSphere AI.

import type { AuditLogRecord, PortalRole } from "../../client/src/types/platform";
import { auditLogs as initialAuditLogs } from "../../client/src/lib/demoData/auditLogs";

export interface AuditEventInput {
  actor: string;
  role: PortalRole | "system";
  action: string;
  entityType: "Parcel" | "Validation" | "Request" | "Report";
  entityId: string;
  status?: "SUCCESS" | "DENIED" | "FAILURE";
  details?: Record<string, unknown> | string;
}

export interface StoredAuditRecord extends AuditLogRecord {
  status?: "SUCCESS" | "DENIED" | "FAILURE";
  details?: string;
}

// Immutable patterns to sanitize any sensitive keys
const SENSITIVE_KEY_PATTERN = /(password|token|secret|authorization|auth|cookie|bearer|key|jwt|credential)/i;

/**
 * Recursively sanitize objects to ensure no tokens, credentials or secrets are logged.
 */
export function sanitizeAuditData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") {
    // Redact bearer tokens or jwt-like strings (header.payload.signature)
    if (/bearer\s+[a-zA-Z0-9._-]+/i.test(data)) {
      return data.replace(/bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [REDACTED]");
    }
    if (/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(data)) {
      return "[REDACTED_JWT]";
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeAuditData);
  }
  if (typeof data === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        clean[key] = "[REDACTED]";
      } else {
        clean[key] = sanitizeAuditData(value);
      }
    }
    return clean;
  }
  return data;
}

class AuditService {
  private auditStore: StoredAuditRecord[] = [...initialAuditLogs];
  private counter = 1000;

  /**
   * Append an audit event to the store.
   * Enforces data sanitization and deterministic ID assignment.
   */
  public recordEvent(input: AuditEventInput): StoredAuditRecord {
    this.counter += 1;
    const sanitizedActor = typeof input.actor === "string" ? input.actor.trim().slice(0, 100) : "System";
    const sanitizedAction = typeof input.action === "string" ? input.action.trim().slice(0, 200) : "Unknown Action";
    const sanitizedEntityId = typeof input.entityId === "string" ? input.entityId.trim().slice(0, 100) : "N/A";

    let detailsString: string | undefined;
    if (typeof input.details === "string") {
      detailsString = String(sanitizeAuditData(input.details)).slice(0, 500);
    } else if (input.details && typeof input.details === "object") {
      const sanitized = sanitizeAuditData(input.details);
      detailsString = JSON.stringify(sanitized).slice(0, 500);
    }

    const record: StoredAuditRecord = {
      id: `AUD-${Date.now()}-${this.counter}`,
      actor: sanitizedActor,
      role: input.role as PortalRole,
      action: sanitizedAction,
      entityType: input.entityType,
      entityId: sanitizedEntityId,
      timestamp: new Date().toISOString(),
      status: input.status ?? "SUCCESS",
      ...(detailsString ? { details: detailsString } : {}),
    };

    // Prepend to match existing audit log ordering (newest first)
    this.auditStore.unshift(record);
    return record;
  }

  /**
   * Retrieve all audit logs (read-only copy).
   */
  public getLogs(): StoredAuditRecord[] {
    return [...this.auditStore];
  }

  /**
   * Query audit logs by filter criteria.
   */
  public queryLogs(filters?: {
    entityType?: string;
    entityId?: string;
    actor?: string;
    role?: string;
  }): StoredAuditRecord[] {
    let logs = this.getLogs();
    if (!filters) return logs;

    if (filters.entityType) {
      logs = logs.filter(
        (l) => l.entityType.toLowerCase() === filters.entityType?.toLowerCase()
      );
    }
    if (filters.entityId) {
      logs = logs.filter(
        (l) => l.entityId.toLowerCase() === filters.entityId?.toLowerCase()
      );
    }
    if (filters.actor) {
      logs = logs.filter((l) =>
        l.actor.toLowerCase().includes(filters.actor?.toLowerCase() || "")
      );
    }
    if (filters.role) {
      logs = logs.filter(
        (l) => l.role.toLowerCase() === filters.role?.toLowerCase()
      );
    }
    return logs;
  }

  /**
   * Reset the store for isolated unit tests.
   */
  public resetForTesting(): void {
    this.auditStore = [...initialAuditLogs];
    this.counter = 1000;
  }
}

export const auditService = new AuditService();
