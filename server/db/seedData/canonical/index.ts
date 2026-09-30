/**
 * Canonical LandSphere AI demo identifiers (Prompt 10 → Prompt 11 bridge).
 *
 * Every stable identifier used by the PostgreSQL + PostGIS seed lives under this
 * folder so the database foundation and the Prompt 10 frontend demo data agree on
 * exactly one ID system.
 */
export * from "./core";
export * from "./records";
export * from "./secondarySignals";
export * from "./secondaryCases";
export * from "./workflow";
export * from "./reporting";
