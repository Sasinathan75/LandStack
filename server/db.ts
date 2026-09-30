import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { ENV } from "./_core/env";
import {
  checkPostgis,
  checkSpatialQuery,
  getDatabaseHealth,
  type DatabaseCheck,
  type DatabaseHealthReport,
} from "./db/health";
import {
  closeDatabase,
  describeDatabaseTarget,
  getDb,
  getDbOrThrow,
  getPool,
  isDatabaseConfigured,
  queryRaw,
  sanitizeDatabaseError,
  type LandSphereDatabase,
} from "./db/client";

export {
  closeDatabase,
  describeDatabaseTarget,
  getDb,
  getDbOrThrow,
  getDatabaseHealth,
  getPool,
  isDatabaseConfigured,
  queryRaw,
  sanitizeDatabaseError,
  schema,
};
export type { DatabaseCheck, DatabaseHealthReport, LandSphereDatabase };

/**
 * Backwards-compatible health check for PostgreSQL connectivity.
 * Prefer {@link getDatabaseHealth} for the full diagnostic report.
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  timestamp: string;
  version?: string;
  target?: string | null;
  error?: string;
}> {
  const db = getPool();
  if (!db) {
    return {
      connected: false,
      timestamp: new Date().toISOString(),
      target: describeDatabaseTarget(),
      error: "DATABASE_URL not configured or pool unavailable",
    };
  }

  try {
    const result = await queryRaw<{ version: string }>("SELECT version() AS version;");
    return {
      connected: true,
      timestamp: new Date().toISOString(),
      version: result.rows[0]?.version,
      target: describeDatabaseTarget(),
    };
  } catch (error) {
    return {
      connected: false,
      timestamp: new Date().toISOString(),
      target: describeDatabaseTarget(),
      error: sanitizeDatabaseError(error),
    };
  }
}

/**
 * Backwards-compatible health check for the PostGIS extension.
 * Prefer {@link getDatabaseHealth} for the full diagnostic report.
 */
export async function checkPostgisHealth(): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}> {
  const { check, postgisVersion } = await checkPostgis();
  if (check.status === "ok") {
    return { available: true, version: postgisVersion ?? "enabled" };
  }
  return {
    available: false,
    error: check.error ?? check.detail,
  };
}

export async function upsertUser(user: schema.InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: schema.InsertUser = {
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.openId === ENV.ownerOpenId ? "admin" : (user.role ?? "user"),
      lastSignedIn: user.lastSignedIn ?? new Date(),
    };

    await db
      .insert(schema.users)
      .values(values)
      .onConflictDoUpdate({
        target: schema.users.openId,
        set: {
          name: values.name,
          email: values.email,
          loginMethod: values.loginMethod,
          role: values.role,
          lastSignedIn: values.lastSignedIn,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", sanitizeDatabaseError(error));
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/** Convenience helper: true when PostGIS answers a spatial query. */
export async function isPostgisAvailable(): Promise<boolean> {
  const { check } = await checkSpatialQuery();
  return check.status === "ok";
}
