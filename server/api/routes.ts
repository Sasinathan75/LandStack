import { Router, type Response } from "express";
import {
  requireAuth,
  requireRole,
  requireCitizen,
  requireGovernment,
  sendForbidden,
  type AuthenticatedRequest,
} from "../auth/authorization";
import {
  demoParcels,
  validationResults,
  satelliteObservations,
  serviceRequests as initialServiceRequests,
  reports as initialReports,
} from "../../client/src/lib/demoData";
import { generateReport } from "../reports/reportService";
import { saveDocument, getDocument, listDocuments } from "../reports/documentStore";
import { getSatellitePreview } from "../gis/satellite";
import { collectionBBox, parcelFeatureCollection, parcelFeatureFromParcel } from "../gis/parcelFeatures";
import { parcelRepository } from "../db/repositories/parcelRepository";
import { LANDSPHERE_SRID } from "../db/geometry";
import type { ServiceRequest } from "../../client/src/types/platform";
import { validateParcel } from "../ai/validation";
import { securityHeadersMiddleware } from "../security/headers";
import { sensitiveRateLimiter } from "../security/rateLimiter";
import { isValidId, isValidText, sendValidationError } from "../security/validation";
import { auditService } from "../audit/auditService";

export const apiRouter = Router();

// Apply baseline security headers & sensitive API cache control (Prompt 18)
apiRouter.use(securityHeadersMiddleware);

// Mutable in-memory stores for runtime lifecycle
const requestStore: ServiceRequest[] = [
  ...initialServiceRequests,
  // Add a secondary citizen request for cross-tenant boundary verification
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
const reportStore = [...initialReports];

// ==========================================
// Citizen & Shared Endpoints
// ==========================================

/**
 * GET /api/parcels
 * Search and list parcels with GIS boundaries.
 * Allowed: CITIZEN, GOVERNMENT
 */
apiRouter.get(
  "/api/parcels",
  requireRole("CITIZEN", "GOVERNMENT"),
  (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const query = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const district = typeof req.query.district === "string" ? req.query.district.trim().toLowerCase() : "";

    let parcels = demoParcels;

    // If citizen, they can search all registered parcels or view their authorized parcels
    if (district) {
      parcels = parcels.filter((p) => p.locality.toLowerCase().includes(district));
    }

    if (query) {
      parcels = parcels.filter((p) =>
        `${p.id} ${p.ulpin} ${p.locality} ${p.owner || ""}`.toLowerCase().includes(query)
      );
    }

    res.json({
      success: true,
      count: parcels.length,
      userRole: authReq.authRole,
      parcels,
    });
  }
);

/**
 * GET /api/parcels/:id
 * Retrieve single unified parcel identity and 360 profile.
 * Allowed: CITIZEN, GOVERNMENT
 */
apiRouter.get(
  "/api/parcels/:id",
  requireRole("CITIZEN", "GOVERNMENT"),
  async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    if (!isValidId(id)) {
      sendValidationError(res, "Invalid parcel identifier");
      return;
    }

    // PostgreSQL/PostGIS is the authority: real geometry + real land-status rows.
    const parcel = await parcelRepository.findById(id);

    if (!parcel) {
      res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Parcel ${id} not found`,
      });
      return;
    }

    // Audit parcel access
    auditService.recordEvent({
      actor: authReq.user.name || authReq.user.openId || "Authenticated User",
      role: authReq.authRole === "GOVERNMENT" ? "government" : "citizen",
      action: "View Parcel",
      entityType: "Parcel",
      entityId: parcel.id,
      status: "SUCCESS",
    });

    res.json({
      success: true,
      source: parcel.source ?? "bundled",
      parcel,
      details: parcel.details ?? null,
      feature: parcelFeatureFromParcel(parcel),
    });
  }
);


/**
 * POST /api/requests
 * Submit citizen service request.
 * Allowed: CITIZEN only.
 *
 * Privilege Escalation Prevention:
 * The citizenId is strictly bound to the authenticated citizen on the server.
 * Any citizenId or role sent in req.body or headers is ignored.
 */
apiRouter.post(
  "/api/requests",
  requireCitizen,
  sensitiveRateLimiter.getMiddleware(),
  (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { parcelId, serviceType, purpose, amount } = req.body;

    if (!parcelId || !serviceType) {
      sendValidationError(res, "parcelId and serviceType are required");
      return;
    }

    if (!isValidId(String(parcelId)) || !isValidText(serviceType, true, 100)) {
      sendValidationError(res, "Invalid request input parameters");
      return;
    }

    if (purpose && !isValidText(purpose, false, 500)) {
      sendValidationError(res, "Purpose exceeds maximum allowed length");
      return;
    }

    // Force server-authenticated identity; do NOT trust req.body.citizenId
    const verifiedCitizenId =
      authReq.user.citizenId ||
      (authReq.user.openId.startsWith("CIT-") ? authReq.user.openId : "CIT-DEMO-001");

    const newRequest: ServiceRequest = {
      id: `REQ-${new Date().getFullYear()}-${String(requestStore.length + 1001).padStart(5, "0")}`,
      citizenId: verifiedCitizenId,
      parcelId: String(parcelId),
      serviceType: serviceType || "Certified RoR copy",
      submittedDate: new Date().toISOString().split("T")[0],
      status: "Submitted",
      lastUpdated: new Date().toISOString().split("T")[0],
    };

    requestStore.unshift(newRequest);

    // Record audit event
    auditService.recordEvent({
      actor: authReq.user.name || verifiedCitizenId,
      role: "citizen",
      action: "Submit Service Request",
      entityType: "Request",
      entityId: newRequest.id,
      status: "SUCCESS",
    });

    res.status(201).json({
      success: true,
      message: "Service request submitted successfully",
      request: newRequest,
    });
  }
);

/**
 * GET /api/requests
 * Retrieve service request queue.
 * - CITIZEN: Returns ONLY requests owned by the authenticated citizen.
 * - GOVERNMENT / ADMIN: Returns all requests in the system queue.
 */
apiRouter.get(
  "/api/requests",
  requireAuth,
  (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const isGov = authReq.authRole === "GOVERNMENT" || authReq.authRole === "ADMIN";

    let requests: ServiceRequest[];

    if (isGov) {
      // Government sees all citizen requests
      requests = requestStore;
    } else {
      // Citizen sees ONLY their own service requests
      const citizenId =
        authReq.user.citizenId ||
        (authReq.user.openId.startsWith("CIT-") ? authReq.user.openId : "CIT-DEMO-001");

      requests = requestStore.filter(
        (r) => r.citizenId.toLowerCase() === citizenId.toLowerCase()
      );
    }

    res.json({
      success: true,
      count: requests.length,
      role: authReq.authRole,
      requests,
    });
  }
);

/**
 * GET /api/requests/:id
 * Track specific service request status.
 * - CITIZEN: Allowed ONLY if request.citizenId === caller.citizenId.
 *   Attempts to access another citizen's request return HTTP 403 Forbidden.
 * - GOVERNMENT / ADMIN: Allowed to access any request.
 */
apiRouter.get(
  "/api/requests/:id",
  requireAuth,
  (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    if (!isValidId(id)) {
      sendValidationError(res, "Invalid service request identifier");
      return;
    }

    const request = requestStore.find((r) => r.id.toLowerCase() === id.toLowerCase());

    if (!request) {
      res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Service request ${id} not found`,
      });
      return;
    }

    const isGov = authReq.authRole === "GOVERNMENT" || authReq.authRole === "ADMIN";

    if (!isGov) {
      const citizenId =
        authReq.user.citizenId ||
        (authReq.user.openId.startsWith("CIT-") ? authReq.user.openId : "CIT-DEMO-001");

      if (request.citizenId.toLowerCase() !== citizenId.toLowerCase()) {
        sendForbidden(res, undefined, authReq.user.name || authReq.user.openId);
        return;
      }
    }

    res.json({
      success: true,
      request,
    });
  }
);

// ==========================================
// Government-Only Endpoints
// ==========================================

/**
 * GET /api/validation
 * Query AI validation findings and risk scores.
 * Allowed: GOVERNMENT only.
 */
apiRouter.get(
  "/api/validation",
  requireGovernment,
  (_req, res: Response) => {
    res.json({
      success: true,
      count: validationResults.length,
      validations: validationResults,
    });
  }
);

/**
 * POST /api/validation
 * Perform AI validation for a parcel. Government only.
 */
apiRouter.post(
  "/api/validation",
  requireGovernment,
  sensitiveRateLimiter.getMiddleware(),
  (req, res: Response) => {
    const { parcelId } = req.body;
    if (!parcelId) {
      sendValidationError(res, "parcelId is required");
      return;
    }
    if (!isValidId(parcelId)) {
      sendValidationError(res, "Invalid parcel identifier");
      return;
    }
    const validation = validateParcel(parcelId);
    // Record audit log
    const authReq = req as AuthenticatedRequest;
    auditService.recordEvent({
      actor: authReq.user.name || "Government Officer",
      role: "government",
      action: "Validate Parcel",
      entityType: "Parcel",
      entityId: parcelId,
      status: "SUCCESS",
    });
    res.json({ success: true, validation });
  }
);

/**
 * GET /api/satellite
 * Query satellite change detection observations.
 * Allowed: GOVERNMENT only.
 */
apiRouter.get(
  "/api/satellite",
  requireGovernment,
  sensitiveRateLimiter.getMiddleware(),
  (req, res: Response) => {
    const parcelId = typeof req.query.parcelId === "string" ? req.query.parcelId : undefined;
    if (!parcelId) {
      sendValidationError(res, "parcelId query parameter is required");
      return;
    }
    if (!isValidId(parcelId)) {
      sendValidationError(res, "Invalid parcel identifier");
      return;
    }
    const satellite = getSatellitePreview(parcelId);
    if (!satellite) {
      res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Satellite data for parcel ${parcelId} not found`,
      });
      return;
    }

    // Record audit log
    const authReq = req as AuthenticatedRequest;
    auditService.recordEvent({
      actor: authReq.user.name || "Government Officer",
      role: "government",
      action: "View Satellite Imagery",
      entityType: "Parcel",
      entityId: parcelId,
      status: "SUCCESS",
    });

    res.json({ success: true, satellite });
  }
);

/**
 * POST /api/reviews/:id/decision
 * Record government officer review decisions.
 * Allowed: GOVERNMENT only.
 */
apiRouter.post(
  "/api/reviews/:id/decision",
  requireGovernment,
  (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { decision, comments } = req.body;

    if (!isValidId(id)) {
      sendValidationError(res, "Invalid review case identifier");
      return;
    }
    if (comments && !isValidText(comments, false, 1000)) {
      sendValidationError(res, "Comments exceed maximum length");
      return;
    }

    const reviewAction = {
      caseId: id,
      decision: decision || "Approved",
      comments: comments || "Officer review completed",
      officer: authReq.user.name || "Government Officer",
      officerId: authReq.user.openId,
      timestamp: new Date().toISOString(),
    };

    // Append to audit log
    auditService.recordEvent({
      actor: authReq.user.name || "Government Officer",
      role: "government",
      action: `Review Decision: ${reviewAction.decision}`,
      entityType: "Validation",
      entityId: id,
      status: "SUCCESS",
    });

    res.json({
      success: true,
      message: `Review decision recorded for case ${id}`,
      review: reviewAction,
    });
  }
);

/**
 * GET /api/audit
 * Query immutable audit logs.
 * Allowed: GOVERNMENT only.
 */
apiRouter.get(
  "/api/audit",
  requireGovernment,
  (_req, res: Response) => {
    const logs = auditService.getLogs();
    res.json({
      success: true,
      count: logs.length,
      auditLogs: logs,
    });
  }
);

/**
 * POST /api/reports/generate
 * Generate structured parcel and governance reports.
 * Allowed: GOVERNMENT only.
 */
apiRouter.post(
  "/api/reports/generate",
  requireGovernment,
  sensitiveRateLimiter.getMiddleware(),
  (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { parcelId, type, scope } = req.body as { parcelId?: string; type?: string; scope?: string };

    if (parcelId !== undefined && !isValidId(parcelId)) {
      sendValidationError(res, "Invalid parcel identifier");
      return;
    }

    const targetParcelId = parcelId !== undefined
      ? parcelId
      : (scope && demoParcels.some((p) => p.id.toLowerCase() === scope.toLowerCase()) ? scope : "LS-PAR-0428");

    if (!targetParcelId) {
      sendValidationError(res, "parcelId is required");
      return;
    }

    const report = generateReport(targetParcelId);
    if (!report) {
      res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Parcel ${targetParcelId} not found`
      });
      return;
    }

    // Store the generated report document
    saveDocument(report);

    // Record audit log
    auditService.recordEvent({
      actor: authReq.user.name || "Government Officer",
      role: "government",
      action: `Generate Report ${report.id}`,
      entityType: "Report",
      entityId: report.id,
      status: "SUCCESS",
    });

    res.status(201).json({
      success: true,
      message: "Report generated successfully",
      report: {
        id: report.id,
        parcelId: report.parcelId,
        generatedAt: report.generatedAt,
        status: report.status,
      },
    });
  }
);

// ------------------------------------------
// Report Retrieval Endpoints (Government only)
// ------------------------------------------

apiRouter.get(
  "/api/reports",
  requireGovernment,
  (req, res: Response) => {
    const parcelId = typeof req.query.parcelId === "string" ? req.query.parcelId : undefined;
    const docs = listDocuments(parcelId);
    res.json({
      success: true,
      count: docs.length,
      reports: docs.map((d) => ({
        id: d.id,
        parcelId: d.parcelId,
        generatedAt: d.generatedAt,
        status: d.status,
      })),
    });
  }
);

apiRouter.get(
  "/api/reports/:id",
  requireGovernment,
  (req, res: Response) => {
    const { id } = req.params;

    if (!isValidId(id)) {
      sendValidationError(res, "Invalid report identifier");
      return;
    }

    const doc = getDocument(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Report ${id} not found`,
      });
      return;
    }
    res.json({
      success: true,
      report: doc,
    });
  }
);

/**
 * GET /api/gis/parcels.geojson
 * Serve cadastral parcel boundaries as a GeoJSON FeatureCollection for the
 * MapLibre GIS Explorer map. Reads the real PostgreSQL/PostGIS geometry
 * (`parcels.geometry`, SRID-verified and transformed to EPSG:4326 by the
 * repository) and annotates seeded restrictions per parcel.
 * Allowed: CITIZEN, GOVERNMENT
 */
apiRouter.get(
  "/api/gis/parcels.geojson",
  requireRole("CITIZEN", "GOVERNMENT"),
  async (_req, res: Response) => {
    try {
      const [parcels, restrictions, extent] = await Promise.all([
        parcelRepository.findParcels(),
        parcelRepository.findRestrictions(),
        parcelRepository.datasetExtent(),
      ]);

      const restrictionTypes = new Map<string, string[]>();
      for (const restriction of restrictions) {
        const types = restrictionTypes.get(restriction.parcelId) ?? [];
        if (!types.includes(restriction.restrictionType)) {
          types.push(restriction.restrictionType);
        }
        restrictionTypes.set(restriction.parcelId, types);
      }

      const featureCollection = parcelFeatureCollection(parcels, restrictionTypes);
      const bbox = extent?.bbox ?? collectionBBox(featureCollection.features);
      const source = parcels[0]?.source ?? "bundled";

      res.json({
        success: true,
        count: featureCollection.features.length,
        restrictedCount: featureCollection.features.filter(
          (feature) => feature.properties.restriction
        ).length,
        source,
        // Explicit CRS so the client never has to guess the axis order.
        crs: { type: "name", properties: { name: `urn:ogc:def:crs:EPSG::${LANDSPHERE_SRID}` } },
        bbox,
        srids: extent?.srids ?? [LANDSPHERE_SRID],
        geometryTypes: extent?.geometryTypes ?? ["POLYGON"],
        parcelsInDatabase: extent?.parcels ?? parcels.length,
        featureCollection,
      });
    } catch (error) {
      console.warn("[GIS] Failed to build parcel GeoJSON:", error);
      res.status(500).json({
        success: false,
        error: "GEOJSON_FAILED",
        message: "Unable to build parcel GeoJSON",
      });
    }
  }
);


/**
 * GET /api/gis/monitor
 * GIS monitoring status and boundaries overview.
 * Allowed: GOVERNMENT only.
 */
apiRouter.get(
  "/api/gis/monitor",
  requireGovernment,
  (_req, res: Response) => {
    res.json({
      success: true,
      totalParcelsMonitored: demoParcels.length,
      flaggedCount: demoParcels.filter((p) => p.status === "Flagged").length,
      underReviewCount: demoParcels.filter((p) => p.status === "Under review").length,
      verifiedCount: demoParcels.filter((p) => p.status === "Verified").length,
      activeLayers: ["Parcel boundaries", "AI risk heatmap", "Satellite NDV delta", "Zoning overlay"],
      status: "operational",
    });
  }
);

/**
 * GET /api/analytics
 * Governance and risk analytics summary.
 * Allowed: GOVERNMENT only.
 */
apiRouter.get(
  "/api/analytics",
  requireGovernment,
  (_req, res: Response) => {
    const highRisk = validationResults.filter((v) => v.riskLevel === "High").length;
    const mediumRisk = validationResults.filter((v) => v.riskLevel === "Medium").length;
    const lowRisk = validationResults.filter((v) => v.riskLevel === "Low").length;

    res.json({
      success: true,
      parcelsTotal: demoParcels.length,
      riskDistribution: {
        high: highRisk,
        medium: mediumRisk,
        low: lowRisk,
      },
      openValidations: validationResults.filter((v) => v.status === "Open").length,
      pendingReviews: 18,
      satelliteAnomalies: satelliteObservations.filter((s) => s.reviewStatus !== "Clear").length,
      averageSlaDaysRemaining: 4.2,
    });
  }
);

/**
 * GET /api/alerts
 * Active government alerts and anomaly notifications.
 * Allowed: GOVERNMENT only.
 */
apiRouter.get(
  "/api/alerts",
  requireGovernment,
  (_req, res: Response) => {
    const alerts = [
      {
        id: "ALT-01",
        severity: "High",
        title: "Ownership mismatch detected",
        parcelId: "LS-PAR-0428",
        timestamp: "2026-09-16T10:00:00Z",
      },
      {
        id: "ALT-02",
        severity: "Medium",
        title: "Vegetation loss on agricultural parcel",
        parcelId: "LS-PAR-0407",
        timestamp: "2026-09-15T14:30:00Z",
      },
      {
        id: "ALT-03",
        severity: "High",
        title: "Survey boundary overlap with public easement",
        parcelId: "LS-PAR-0412",
        timestamp: "2026-09-14T09:15:00Z",
      },
    ];

    res.json({
      success: true,
      count: alerts.length,
      alerts,
    });
  }
);

/**
 * GET /api/workflow
 * Government workflow management status.
 * Allowed: GOVERNMENT only.
 */
apiRouter.get(
  "/api/workflow",
  requireGovernment,
  (_req, res: Response) => {
    res.json({
      success: true,
      activeQueueCount: requestStore.filter((r) => r.status !== "Closed").length,
      assignedOfficerCases: 14,
      pendingFinalApproval: 4,
      slaComplianceRate: "94.6%",
    });
  }
);
