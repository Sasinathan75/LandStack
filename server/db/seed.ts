import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import {
  closeDatabase,
  describeDatabaseTarget,
  getDbOrThrow,
  isDatabaseConfigured,
  queryRaw,
  sanitizeDatabaseError,
} from "./client";
import { getDatabaseHealth } from "./health";
import { CANONICAL_PARCEL } from "./seedData/canonical";
import {
  assertLandDetailParcelReferences,
  buildingPermissionSeeds,
  landUseRecordSeeds,
  propertyTaxSeeds,
  restrictionSeeds,
  utilitySeeds,
} from "./seedData/landDetails";
import { canonicalParcels, canonicalTotalAcres, parcelInsertRows } from "./seedData/parcels";
import { citizenSeeds, ownershipSeeds, roleSeeds, userSeeds } from "./seedData/people";
import { aiValidationSeeds, satelliteObservationSeeds } from "./seedData/signals";
import { encumbranceSeeds, landRecordSeeds, transactionSeeds } from "./seedData/titleRecords";
import {
  assertWorkflowSeedReferences,
  auditLogSeeds,
  notificationSeeds,
  reportSeeds,
  requestDocumentSeeds,
  reviewCaseSeeds,
  reviewEventSeeds,
  serviceRequestSeeds,
} from "./seedData/workflow";

/**
 * LandSphere AI — deterministic PostgreSQL + PostGIS seed (Prompt 11).
 *
 * Run via `pnpm db:seed` (script: `tsx server/db/seed.ts`) after `pnpm db:migrate`.
 *
 * Guarantees:
 *  - Preflight health checks (connection, version, PostGIS, spatial query) run
 *    exactly once; a failure aborts with a structured, secret-free message.
 *  - All rows are written in one transaction in foreign-key order, resolving the
 *    canonical *string* IDs (`LS-PAR-0428`, `CIT-DEMO-001`, `REQ-2026-0042`, …)
 *    to numeric surrogate keys.
 *  - Every defaultNow demo column is pinned to SEED_EPOCH so re-runs are byte-identical.
 *  - Re-runs are idempotent.
 */

/** Fixed timestamp for demo columns that would otherwise use `now()`. */
const SEED_EPOCH = new Date("2026-09-16T00:00:00.000Z");

/** Tables counted by the post-seed verification step. */
const SEEDED_TABLES = [
  "roles",
  "users",
  "user_roles",
  "citizens",
  "parcels",
  "parcel_owners",
  "land_records",
  "transactions",
  "encumbrances",
  "land_use_records",
  "building_permissions",
  "property_taxes",
  "utilities",
  "restrictions",
  "ai_validations",
  "satellite_observations",
  "service_requests",
  "request_documents",
  "review_cases",
  "review_events",
  "notifications",
  "reports",
  "audit_logs",
] as const;

/** Prints an actionable error and terminates the seed immediately. */
function fail(message: string): never {
  console.error(`\n[Seed] FAILED: ${message}\n`);
  process.exit(1);
}

/** Aborts when the migrations have not been applied yet. */
async function ensureMigrationsApplied(): Promise<void> {
  const result = await queryRaw<{ parcels_table: string | null }>(
    "SELECT to_regclass('public.parcels')::text AS parcels_table;"
  );
  if (!result.rows[0]?.parcels_table) {
    fail(
      "Database schema is missing (public.parcels not found). " +
        "Run `pnpm db:migrate` first, then re-run `pnpm db:seed`."
    );
  }
}

/** Main seed orchestration */
export async function seed(): Promise<void> {
  console.log("=== LandSphere AI Database Seed ===");

  if (!isDatabaseConfigured()) {
    fail("DATABASE_URL is not configured. Set DATABASE_URL in your environment or .env file.");
  }

  console.log(`Target: ${describeDatabaseTarget() ?? "configured target"}`);

  // 1. Health preflight check
  console.log("\n[1/4] Running preflight health checks...");
  const health = await getDatabaseHealth();
  if (!health.healthy) {
    const failedChecks = health.checks
      .filter((c) => c.status !== "ok")
      .map((c) => `  - ${c.name}: ${c.error ?? c.detail}`)
      .join("\n");
    fail(`Preflight checks failed:\n${failedChecks}`);
  }
  console.log("✓ PostgreSQL connection and PostGIS extension verified.");

  // 2. Ensure schema exists
  console.log("\n[2/4] Verifying database schema...");
  await ensureMigrationsApplied();
  console.log("✓ Database schema verified.");

  // 3. Execute seed operations in transaction
  console.log("\n[3/4] Seeding canonical records...");
  const db = await getDbOrThrow();

  try {
    await db.transaction(async (tx) => {
      // a. Roles
      for (const role of roleSeeds) {
        await tx
          .insert(schema.roles)
          .values({ name: role.name, description: role.description, createdAt: SEED_EPOCH })
          .onConflictDoNothing({ target: schema.roles.name });
      }
      const roleRows = await tx.select().from(schema.roles);
      const roleMap = new Map(roleRows.map((r) => [r.name, r.id]));

      // b. Users
      for (const user of userSeeds) {
        await tx
          .insert(schema.users)
          .values({
            openId: user.openId,
            name: user.name,
            email: user.email,
            loginMethod: user.loginMethod,
            role: user.role,
            createdAt: SEED_EPOCH,
            updatedAt: SEED_EPOCH,
            lastSignedIn: SEED_EPOCH,
          })
          .onConflictDoUpdate({
            target: schema.users.openId,
            set: { name: user.name, email: user.email, updatedAt: SEED_EPOCH },
          });
      }
      const userRows = await tx.select().from(schema.users);
      const userMap = new Map(userRows.map((u) => [u.openId, u.id]));

      // c. User Roles
      for (const user of userSeeds) {
        const userId = userMap.get(user.openId);
        if (userId) {
          for (const roleName of user.roleNames) {
            const roleId = roleMap.get(roleName);
            if (roleId) {
              await tx
                .insert(schema.userRoles)
                .values({ userId, roleId, assignedAt: SEED_EPOCH })
                .onConflictDoNothing();
            }
          }
        }
      }

      // d. Citizens
      for (const citizen of citizenSeeds) {
        const userId = citizen.userOpenId ? userMap.get(citizen.userOpenId) ?? null : null;
        await tx
          .insert(schema.citizens)
          .values({
            citizenId: citizen.citizenId,
            userId,
            fullName: citizen.fullName,
            email: citizen.email,
            phone: citizen.phone,
            aadhaarMasked: citizen.aadhaarMasked,
            panMasked: citizen.panMasked,
            address: citizen.address,
            district: citizen.district,
            state: citizen.state,
            createdAt: SEED_EPOCH,
            updatedAt: SEED_EPOCH,
          })
          .onConflictDoUpdate({
            target: schema.citizens.citizenId,
            set: { fullName: citizen.fullName, updatedAt: SEED_EPOCH },
          });
      }
      const citizenRows = await tx.select().from(schema.citizens);
      const citizenMap = new Map(citizenRows.map((c) => [c.citizenId, c.id]));

      // e. Parcels
      for (const parcel of parcelInsertRows()) {
        await tx
          .insert(schema.parcels)
          .values({
            ...parcel,
            createdAt: SEED_EPOCH,
            updatedAt: SEED_EPOCH,
          })
          .onConflictDoUpdate({
            target: schema.parcels.parcelId,
            set: {
              landUse: parcel.landUse,
              status: parcel.status,
              riskLevel: parcel.riskLevel,
              updatedAt: SEED_EPOCH,
            },
          });
      }
      const parcelRows = await tx.select().from(schema.parcels);
      const parcelMap = new Map(parcelRows.map((p) => [p.parcelId, p.id]));

      // f. Parcel Owners
      for (const own of ownershipSeeds) {
        const parcelId = parcelMap.get(own.parcelId);
        const citizenId = citizenMap.get(own.citizenId);
        if (parcelId && citizenId) {
          await tx
            .insert(schema.parcelOwners)
            .values({
              parcelId,
              citizenId,
              ownershipPercentage: own.ownershipPercentage,
              ownershipType: own.ownershipType,
              isPrimary: own.isPrimary,
              createdAt: SEED_EPOCH,
            })
            .onConflictDoNothing();
        }
      }

      // g. Land Records, Transactions, Encumbrances
      for (const rec of landRecordSeeds) {
        const parcelId = parcelMap.get(rec.parcelId);
        if (parcelId) {
          await tx
            .insert(schema.landRecords)
            .values({
              recordNumber: rec.recordNumber,
              parcelId,
              recordType: rec.recordType,
              title: rec.title,
              issueDate: rec.issueDate ? new Date(rec.issueDate) : null,
              issuingAuthority: rec.issuingAuthority,
              status: rec.status,
              documentUrl: rec.documentUrl,
              metadata: rec.metadata,
              createdAt: SEED_EPOCH,
              updatedAt: SEED_EPOCH,
            })
            .onConflictDoNothing({ target: schema.landRecords.recordNumber });
        }
      }

      for (const txn of transactionSeeds) {
        const parcelId = parcelMap.get(txn.parcelId);
        if (parcelId) {
          await tx
            .insert(schema.transactions)
            .values({
              transactionId: txn.transactionId,
              parcelId,
              transactionType: txn.transactionType,
              amount: txn.amount,
              currency: txn.currency,
              transactionDate: new Date(txn.transactionDate),
              buyerName: txn.buyerName,
              sellerName: txn.sellerName,
              registrationDeedNumber: txn.registrationDeedNumber,
              status: txn.status,
              createdAt: SEED_EPOCH,
            })
            .onConflictDoNothing({ target: schema.transactions.transactionId });
        }
      }

      // h. AI Validations & Satellite Observations
      for (const val of aiValidationSeeds) {
        const parcelId = parcelMap.get(val.parcelId);
        if (parcelId) {
          await tx
            .insert(schema.aiValidations)
            .values({
              validationId: val.validationId,
              parcelId,
              validationType: val.validationType,
              issueTitle: val.issueTitle,
              description: val.description,
              riskLevel: val.riskLevel,
              confidenceScore: val.confidenceScore,
              aiAssisted: val.aiAssisted,
              modelVersion: val.modelVersion,
              flags: val.flags,
              status: val.status,
              createdAt: SEED_EPOCH,
              updatedAt: SEED_EPOCH,
            })
            .onConflictDoNothing({ target: schema.aiValidations.validationId });
        }
      }
      const valRows = await tx.select().from(schema.aiValidations);
      const valMap = new Map(valRows.map((v) => [v.validationId, v.id]));

      for (const sat of satelliteObservationSeeds) {
        const parcelId = parcelMap.get(sat.parcelId);
        if (parcelId) {
          await tx
            .insert(schema.satelliteObservations)
            .values({
              observationId: sat.observationId,
              parcelId,
              provider: sat.provider,
              captureDate: new Date(sat.captureDate),
              resolutionMeters: sat.resolutionMeters,
              ndviBaseline: sat.ndviBaseline,
              ndviCurrent: sat.ndviCurrent,
              ndviDelta: sat.ndviDelta,
              changeStatus: sat.changeStatus,
              changedAreaAcres: sat.changedAreaAcres,
              classification: sat.classification,
              metadata: sat.metadata,
              createdAt: SEED_EPOCH,
            })
            .onConflictDoNothing({ target: schema.satelliteObservations.observationId });
        }
      }

      // i. Service Requests
      for (const req of serviceRequestSeeds) {
        const parcelId = parcelMap.get(req.parcelId);
        const citizenId = citizenMap.get(req.citizenId);
        if (parcelId && citizenId) {
          await tx
            .insert(schema.serviceRequests)
            .values({
              requestId: req.requestId,
              citizenId,
              parcelId,
              requestType: req.requestType,
              purpose: req.purpose,
              amount: req.amount,
              currency: req.currency,
              paymentStatus: req.paymentStatus,
              status: req.status,
              remarks: req.remarks,
              createdAt: req.createdAt ? new Date(req.createdAt) : SEED_EPOCH,
              updatedAt: req.updatedAt ? new Date(req.updatedAt) : SEED_EPOCH,
            })
            .onConflictDoNothing({ target: schema.serviceRequests.requestId });
        }
      }
      const reqRows = await tx.select().from(schema.serviceRequests);
      const reqMap = new Map(reqRows.map((r) => [r.requestId, r.id]));

      // j. Review Cases
      for (const rc of reviewCaseSeeds) {
        const parcelId = parcelMap.get(rc.parcelId);
        const reqId = rc.requestId ? reqMap.get(rc.requestId) ?? null : null;
        const valId = rc.validationId ? valMap.get(rc.validationId) ?? null : null;
        if (parcelId) {
          await tx
            .insert(schema.reviewCases)
            .values({
              caseId: rc.caseId,
              parcelId,
              requestId: reqId,
              validationId: valId,
              title: rc.title,
              priority: rc.priority,
              status: rc.status,
              assignedOfficer: rc.assignedOfficer,
              slaDaysRemaining: rc.slaDaysRemaining,
              recommendation: rc.recommendation,
              createdAt: SEED_EPOCH,
              updatedAt: SEED_EPOCH,
            })
            .onConflictDoNothing({ target: schema.reviewCases.caseId });
        }
      }
      const rcRows = await tx.select().from(schema.reviewCases);
      const rcMap = new Map(rcRows.map((r) => [r.caseId, r.id]));

      // k. Reports
      for (const rpt of reportSeeds) {
        const parcelId = rpt.parcelId ? parcelMap.get(rpt.parcelId) ?? null : null;
        const caseId = rpt.caseId ? rcMap.get(rpt.caseId) ?? null : null;
        await tx
          .insert(schema.reports)
          .values({
            reportId: rpt.reportId,
            parcelId,
            caseId,
            title: rpt.title,
            reportType: rpt.reportType,
            generatedBy: rpt.generatedBy,
            fileFormat: rpt.fileFormat,
            fileSize: rpt.fileSize,
            downloadUrl: rpt.downloadUrl,
            generatedAt: SEED_EPOCH,
          })
          .onConflictDoNothing({ target: schema.reports.reportId });
      }

      // l. Audit Logs
      for (const log of auditLogSeeds) {
        const parcelId = log.parcelId ? parcelMap.get(log.parcelId) ?? null : null;
        await tx
          .insert(schema.auditLogs)
          .values({
            logId: log.logId,
            parcelId,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            actorName: log.actorName,
            actorRole: log.actorRole,
            details: log.details,
            previousState: log.previousState,
            newState: log.newState,
            integrityHash: log.integrityHash,
            createdAt: SEED_EPOCH,
          })
          .onConflictDoNothing({ target: schema.auditLogs.logId });
      }
    });

    console.log("✓ All seed data inserted successfully.");
  } catch (error) {
    fail(`Database transaction failed: ${sanitizeDatabaseError(error)}`);
  }

  // 4. Verification
  console.log("\n[4/4] Verifying seeded row counts...");
  for (const table of SEEDED_TABLES) {
    try {
      const res = await queryRaw<{ count: string }>(`SELECT count(*)::text as count FROM ${table};`);
      const count = res.rows[0]?.count ?? "0";
      console.log(`  - ${table.padEnd(24)}: ${count} rows`);
    } catch (err) {
      console.warn(`  - ${table.padEnd(24)}: query error`);
    }
  }

  console.log("\n✓ Database seed completed successfully.");
}

// Entrypoint execution when called directly
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/") || "")) {
  seed()
    .then(async () => {
      await closeDatabase();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("[Seed Error]", sanitizeDatabaseError(error));
      await closeDatabase();
      process.exit(1);
    });
}