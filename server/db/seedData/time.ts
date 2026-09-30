/**
 * Deterministic date helpers for the LandSphere AI seed.
 *
 * Every demo timestamp is authored as an explicit ISO-8601 literal so that repeated
 * seed runs always write byte-identical rows (no `now()` drift in demo data).
 */

function parse(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`Invalid demo timestamp: ${value}`);
  }
  return parsed;
}

/** Full ISO timestamp, e.g. `2026-09-12T10:14:00.000Z`. */
export function ts(value: string): Date {
  return parse(value);
}

/** Nullable full ISO timestamp. */
export function optionalTs(value?: string | null): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return parse(value);
}

/** Date-only literal pinned to UTC midnight, e.g. `2026-09-12` → `2026-09-12T00:00:00.000Z`. */
export function dayTs(value: string): Date {
  return parse(value.includes("T") ? value : `${value}T00:00:00.000Z`);
}

/** Nullable date-only literal pinned to UTC midnight. */
export function optionalDayTs(value?: string | null): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return dayTs(value);
}
