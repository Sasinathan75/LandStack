import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../../drizzle/schema";

const { Pool } = pg;

/**
 * LandSphere AI — PostgreSQL + PostGIS connection layer.
 *
 * The connection string is always read from the `DATABASE_URL` environment variable.
 * Credentials are never hardcoded and never echoed back in error messages.
 */

export type LandSphereDatabase = NodePgDatabase<typeof schema>;

export const POSTGIS_REQUIRED_MESSAGE =
  "PostGIS extension is not available in this database. Run `CREATE EXTENSION IF NOT EXISTS postgis;` " +
  "as a database superuser (or run `pnpm db:migrate`, which enables it).";

let pool: pg.Pool | null = null;
let database: LandSphereDatabase | null = null;

/** True when DATABASE_URL is configured for this process. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

/**
 * Returns a clear, secret-free description of the configured target database.
 * Example: `localhost:5432/landsphere_ai`
 */
export function describeDatabaseTarget(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    const port = parsed.port || "5432";
    return `${parsed.hostname}:${port}${parsed.pathname}`;
  } catch {
    return "DATABASE_URL is set but could not be parsed as a PostgreSQL URL";
  }
}

export class DatabaseUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

/** Redacts credentials from driver errors before they surface to logs or clients. */
export function sanitizeDatabaseError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const secret = process.env.DATABASE_URL;
  let message = raw;
  if (secret && secret.length > 0) {
    message = message.split(secret).join("[DATABASE_URL]");
  }
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/password=[^\s;]+/gi, "password=[redacted]");
}

/** Creates (once) the shared `pg` connection pool. */
export function getPool(): pg.Pool | null {
  if (!pool && isDatabaseConfigured()) {
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
        max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      });
      pool.on("error", (error) => {
        console.warn("[PostgreSQL Pool Error]", sanitizeDatabaseError(error));
      });
    } catch (error) {
      console.warn("[Database] Failed to create connection pool:", sanitizeDatabaseError(error));
      pool = null;
    }
  }
  return pool;
}

/**
 * Lazily creates the Drizzle instance so local tooling and the existing UI can run
 * without a database. Returns `null` when DATABASE_URL is not configured.
 */
export async function getDb(): Promise<LandSphereDatabase | null> {
  if (!database && isDatabaseConfigured()) {
    try {
      const activePool = getPool();
      if (activePool) {
        database = drizzle(activePool, { schema });
      }
    } catch (error) {
      console.warn("[Database] Failed to initialise Drizzle:", sanitizeDatabaseError(error));
      database = null;
    }
  }
  return database;
}

/** Same as {@link getDb} but throws a clear error instead of returning `null`. */
export async function getDbOrThrow(): Promise<LandSphereDatabase> {
  const db = await getDb();
  if (!db) {
    throw new DatabaseUnavailableError(
      `PostgreSQL is unavailable: DATABASE_URL is not configured. ` +
        `Copy .env.example to .env and set DATABASE_URL (expected target: localhost:5432/landsphere_ai).`
    );
  }
  return db;
}

/** Verifies the database accepts a connection. Throws a clear error when it does not. */
export async function assertDatabaseReachable(): Promise<void> {
  const activePool = getPool();
  if (!activePool) {
    throw new DatabaseUnavailableError(
      "PostgreSQL is unavailable: DATABASE_URL is not configured for this process."
    );
  }
  try {
    const client = await activePool.connect();
    try {
      await client.query("SELECT 1;");
    } finally {
      client.release();
    }
  } catch (error) {
    throw new DatabaseUnavailableError(
      `PostgreSQL is unavailable at ${describeDatabaseTarget() ?? "unknown target"}: ` +
        `${sanitizeDatabaseError(error)}`
    );
  }
}

/** Closes the pool (used by CLI entrypoints so the process can exit). */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    database = null;
  }
}

/** Executes a raw SQL statement through the shared pool (health checks, GIS checks). */
export async function queryRaw<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<pg.QueryResult<T>> {
  const activePool = getPool();
  if (!activePool) {
    throw new DatabaseUnavailableError(
      "PostgreSQL is unavailable: DATABASE_URL is not configured for this process."
    );
  }
  return activePool.query<T>(text, values as never[]);
}

export { schema };
export type { NodePgDatabase };
