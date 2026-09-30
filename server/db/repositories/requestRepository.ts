import { eq, desc } from "drizzle-orm";
import { getDb } from "../client";
import * as schema from "../../../drizzle/schema";
import type { ServiceRequest } from "../../../client/src/types/platform";
import { serviceRequests as initialServiceRequests } from "../../../client/src/lib/demoData";

/**
 * Service Request Repository with in-memory fallback.
 */
export class RequestRepository {
  private inMemoryStore: ServiceRequest[] = [
    ...initialServiceRequests,
    {
      id: "REQ-2026-00999",
      citizenId: "CIT-DEMO-002",
      parcelId: "LS-PAR-0401",
      serviceType: "Certified RoR copy",
      submittedDate: "2026-09-15",
      status: "Submitted",
      lastUpdated: "2026-09-15",
    },
  ];

  /**
   * Find requests filtered by citizenId (optional).
   */
  async findRequests(citizenId?: string): Promise<ServiceRequest[]> {
    const db = await getDb();
    if (!db) {
      if (citizenId) {
        return this.inMemoryStore.filter((r) => r.citizenId === citizenId);
      }
      return [...this.inMemoryStore];
    }

    try {
      const query = db
        .select({
          req: schema.serviceRequests,
          cit: schema.citizens,
          par: schema.parcels,
        })
        .from(schema.serviceRequests)
        .leftJoin(schema.citizens, eq(schema.serviceRequests.citizenId, schema.citizens.id))
        .leftJoin(schema.parcels, eq(schema.serviceRequests.parcelId, schema.parcels.id))
        .orderBy(desc(schema.serviceRequests.createdAt));

      const rows = await query;
      if (rows.length === 0) {
        return citizenId
          ? this.inMemoryStore.filter((r) => r.citizenId === citizenId)
          : [...this.inMemoryStore];
      }

      let mapped: ServiceRequest[] = rows.map((r) => ({
        id: r.req.requestId,
        citizenId: r.cit?.citizenId ?? "CIT-DEMO-001",
        parcelId: r.par?.parcelId ?? "LS-PAR-0428",
        serviceType: r.req.requestType as ServiceRequest["serviceType"],
        submittedDate: r.req.createdAt.toISOString().slice(0, 10),
        status: r.req.status as any,
        lastUpdated: r.req.updatedAt.toISOString().slice(0, 10),
      }));

      if (citizenId) {
        mapped = mapped.filter((r) => r.citizenId === citizenId);
      }

      return mapped;
    } catch (error) {
      console.warn("[RequestRepository] DB query failed, falling back to memory:", error);
      if (citizenId) {
        return this.inMemoryStore.filter((r) => r.citizenId === citizenId);
      }
      return [...this.inMemoryStore];
    }
  }

  /**
   * Find request by ID.
   */
  async findById(requestId: string): Promise<ServiceRequest | undefined> {
    const db = await getDb();
    if (!db) {
      return this.inMemoryStore.find((r) => r.id === requestId);
    }

    try {
      const rows = await db
        .select({
          req: schema.serviceRequests,
          cit: schema.citizens,
          par: schema.parcels,
        })
        .from(schema.serviceRequests)
        .leftJoin(schema.citizens, eq(schema.serviceRequests.citizenId, schema.citizens.id))
        .leftJoin(schema.parcels, eq(schema.serviceRequests.parcelId, schema.parcels.id))
        .where(eq(schema.serviceRequests.requestId, requestId))
        .limit(1);

      if (rows.length === 0) {
        return this.inMemoryStore.find((r) => r.id === requestId);
      }

      const r = rows[0];
      return {
        id: r.req.requestId,
        citizenId: r.cit?.citizenId ?? "CIT-DEMO-001",
        parcelId: r.par?.parcelId ?? "LS-PAR-0428",
        serviceType: r.req.requestType as ServiceRequest["serviceType"],
        submittedDate: r.req.createdAt.toISOString().slice(0, 10),
        status: r.req.status as any,
        lastUpdated: r.req.updatedAt.toISOString().slice(0, 10),
      };
    } catch (error) {
      console.warn("[RequestRepository] findById DB query failed, using memory:", error);
      return this.inMemoryStore.find((r) => r.id === requestId);
    }
  }

  /**
   * Create a new service request.
   */
  async createRequest(data: {
    citizenId: string;
    parcelId: string;
    serviceType: string;
    purpose?: string;
  }): Promise<ServiceRequest> {
    const today = new Date().toISOString().slice(0, 10);
    const newId = `REQ-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const newRequest: ServiceRequest = {
      id: newId,
      citizenId: data.citizenId,
      parcelId: data.parcelId,
      serviceType: data.serviceType as ServiceRequest["serviceType"],
      submittedDate: today,
      status: "Submitted",
      lastUpdated: today,
    };

    // Always maintain in-memory store
    this.inMemoryStore.unshift(newRequest);

    const db = await getDb();
    if (db) {
      try {
        // Resolve numeric citizenId & parcelId
        const citRows = await db
          .select({ id: schema.citizens.id })
          .from(schema.citizens)
          .where(eq(schema.citizens.citizenId, data.citizenId))
          .limit(1);

        const parRows = await db
          .select({ id: schema.parcels.id })
          .from(schema.parcels)
          .where(eq(schema.parcels.parcelId, data.parcelId))
          .limit(1);

        if (citRows.length > 0 && parRows.length > 0) {
          await db.insert(schema.serviceRequests).values({
            requestId: newId,
            citizenId: citRows[0].id,
            parcelId: parRows[0].id,
            requestType: data.serviceType,
            purpose: data.purpose || "Citizen service request",
            status: "Submitted",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        console.warn("[RequestRepository] DB insert failed, preserved in memory:", error);
      }
    }

    return newRequest;
  }
}

export const requestRepository = new RequestRepository();
