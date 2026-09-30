import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * PostGIS Polygon Geometry Type (SRID 4326)
 */
export const geometryPolygon = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "geometry(Polygon, 4326)";
  },
});

// ==========================================
// 1. Users
// ==========================================
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("open_id", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("login_method", { length: 64 }),
    role: varchar("role", { length: 32 }).default("user").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_users_open_id").on(table.openId),
    index("idx_users_email").on(table.email),
  ]
);

// ==========================================
// 2. Roles
// ==========================================
export const roles = pgTable(
  "roles",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 64 }).notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_roles_name").on(table.name)]
);

// ==========================================
// 3. User Roles
// ==========================================
export const userRoles = pgTable(
  "user_roles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    roleId: integer("role_id")
      .references(() => roles.id, { onDelete: "cascade" })
      .notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_user_roles_user_id").on(table.userId),
    index("idx_user_roles_role_id").on(table.roleId),
    uniqueIndex("idx_user_roles_user_role").on(table.userId, table.roleId),
  ]
);

// ==========================================
// 4. Citizens
// ==========================================
export const citizens = pgTable(
  "citizens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    citizenId: varchar("citizen_id", { length: 64 }).notNull().unique(),
    fullName: text("full_name").notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),
    aadhaarMasked: varchar("aadhaar_masked", { length: 32 }),
    panMasked: varchar("pan_masked", { length: 32 }),
    address: text("address"),
    district: varchar("district", { length: 100 }),
    state: varchar("state", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_citizens_citizen_id").on(table.citizenId),
    uniqueIndex("idx_citizens_user_id").on(table.userId),
    index("idx_citizens_email").on(table.email),
  ]
);

// ==========================================
// 5. Parcels (with PostGIS Geometry)
// ==========================================
export const parcels = pgTable(
  "parcels",
  {
    id: serial("id").primaryKey(),
    parcelId: varchar("parcel_id", { length: 64 }).notNull().unique(),
    ulpin: varchar("ulpin", { length: 64 }).notNull().unique(),
    surveyNumber: varchar("survey_number", { length: 64 }).notNull(),
    areaAcres: numeric("area_acres", { precision: 10, scale: 2 }).notNull(),
    landUse: varchar("land_use", { length: 64 }).notNull(),
    location: text("location").notNull(),
    district: varchar("district", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    status: varchar("status", { length: 64 }).default("Active").notNull(),
    riskLevel: varchar("risk_level", { length: 32 }).default("Low").notNull(),
    geometry: geometryPolygon("geometry"),
    geojson: jsonb("geojson"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_parcels_parcel_id").on(table.parcelId),
    uniqueIndex("idx_parcels_ulpin").on(table.ulpin),
    index("idx_parcels_land_use").on(table.landUse),
    index("idx_parcels_status").on(table.status),
    index("idx_parcels_risk_level").on(table.riskLevel),
    index("idx_parcels_geometry_gist").using("gist", table.geometry),
  ]
);

// ==========================================
// 6. Parcel Owners (Relationship)
// ==========================================
export const parcelOwners = pgTable(
  "parcel_owners",
  {
    id: serial("id").primaryKey(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    citizenId: integer("citizen_id")
      .references(() => citizens.id, { onDelete: "restrict" })
      .notNull(),
    ownershipPercentage: numeric("ownership_percentage", { precision: 5, scale: 2 })
      .default("100.00")
      .notNull(),
    ownershipType: varchar("ownership_type", { length: 64 })
      .default("Sole Owner")
      .notNull(),
    isPrimary: boolean("is_primary").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_parcel_owners_parcel_id").on(table.parcelId),
    index("idx_parcel_owners_citizen_id").on(table.citizenId),
    uniqueIndex("idx_parcel_owners_parcel_citizen").on(table.parcelId, table.citizenId),
  ]
);

// ==========================================
// 7. Land Records (RoR, Deeds, Tax receipts)
// ==========================================
export const landRecords = pgTable(
  "land_records",
  {
    id: serial("id").primaryKey(),
    recordNumber: varchar("record_number", { length: 64 }).notNull().unique(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    recordType: varchar("record_type", { length: 64 }).notNull(),
    title: text("title").notNull(),
    issueDate: timestamp("issue_date"),
    issuingAuthority: text("issuing_authority"),
    status: varchar("status", { length: 64 }).default("Verified").notNull(),
    documentUrl: text("document_url"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_land_records_record_number").on(table.recordNumber),
    index("idx_land_records_parcel_id").on(table.parcelId),
  ]
);

// ==========================================
// 8. Transactions
// ==========================================
export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    transactionId: varchar("transaction_id", { length: 64 }).notNull().unique(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    transactionType: varchar("transaction_type", { length: 64 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("INR").notNull(),
    transactionDate: timestamp("transaction_date").notNull(),
    buyerName: text("buyer_name").notNull(),
    sellerName: text("seller_name").notNull(),
    registrationDeedNumber: varchar("registration_deed_number", { length: 64 }),
    status: varchar("status", { length: 64 }).default("Registered").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_transactions_transaction_id").on(table.transactionId),
    index("idx_transactions_parcel_id").on(table.parcelId),
  ]
);

// ==========================================
// 9. Encumbrances
// ==========================================
export const encumbrances = pgTable(
  "encumbrances",
  {
    id: serial("id").primaryKey(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    encumbranceType: varchar("encumbrance_type", { length: 64 }).notNull(),
    holderName: text("holder_name").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }),
    status: varchar("status", { length: 64 }).default("Active").notNull(),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_encumbrances_parcel_id").on(table.parcelId)]
);

// ==========================================
// 10. Land Use Records
// ==========================================
export const landUseRecords = pgTable(
  "land_use_records",
  {
    id: serial("id").primaryKey(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    recordedLandUse: varchar("recorded_land_use", { length: 64 }).notNull(),
    actualLandUse: varchar("actual_land_use", { length: 64 }).notNull(),
    zoningCategory: varchar("zoning_category", { length: 64 }),
    masterPlanZone: varchar("master_plan_zone", { length: 64 }),
    mismatchDetected: boolean("mismatch_detected").default(false).notNull(),
    source: varchar("source", { length: 64 }).default("Revenue Department").notNull(),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_land_use_records_parcel_id").on(table.parcelId)]
);

// ==========================================
// 11. Building Permissions
// ==========================================
export const buildingPermissions = pgTable(
  "building_permissions",
  {
    id: serial("id").primaryKey(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    permitNumber: varchar("permit_number", { length: 64 }).notNull().unique(),
    permitType: varchar("permit_type", { length: 64 }).notNull(),
    structureType: varchar("structure_type", { length: 64 }),
    proposedFloors: integer("proposed_floors"),
    proposedAreaSqFt: numeric("proposed_area_sq_ft", { precision: 10, scale: 2 }),
    status: varchar("status", { length: 64 }).default("Approved").notNull(),
    appliedDate: timestamp("applied_date"),
    approvedDate: timestamp("approved_date"),
    expiryDate: timestamp("expiry_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_building_permissions_permit_number").on(table.permitNumber),
    index("idx_building_permissions_parcel_id").on(table.parcelId),
  ]
);

// ==========================================
// 12. Property Taxes
// ==========================================
export const propertyTaxes = pgTable(
  "property_taxes",
  {
    id: serial("id").primaryKey(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    taxReceiptNumber: varchar("tax_receipt_number", { length: 64 }).notNull().unique(),
    assessmentYear: varchar("assessment_year", { length: 16 }).notNull(),
    amountDue: numeric("amount_due", { precision: 10, scale: 2 }).notNull(),
    amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).notNull(),
    paymentStatus: varchar("payment_status", { length: 32 }).default("Paid").notNull(),
    dueDate: timestamp("due_date"),
    paidDate: timestamp("paid_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_property_taxes_receipt").on(table.taxReceiptNumber),
    index("idx_property_taxes_parcel_id").on(table.parcelId),
  ]
);

// ==========================================
// 13. Utilities
// ==========================================
export const utilities = pgTable(
  "utilities",
  {
    id: serial("id").primaryKey(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    utilityType: varchar("utility_type", { length: 64 }).notNull(),
    connectionStatus: varchar("connection_status", { length: 32 }).default("Connected").notNull(),
    consumerNumber: varchar("consumer_number", { length: 64 }),
    provider: text("provider"),
    connectedDate: timestamp("connected_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_utilities_parcel_id").on(table.parcelId)]
);

// ==========================================
// 14. Restrictions
// ==========================================
export const restrictions = pgTable(
  "restrictions",
  {
    id: serial("id").primaryKey(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    restrictionType: varchar("restriction_type", { length: 64 }).notNull(),
    description: text("description").notNull(),
    severity: varchar("severity", { length: 32 }).default("Medium").notNull(),
    status: varchar("status", { length: 32 }).default("Active").notNull(),
    imposedBy: text("imposed_by"),
    imposedDate: timestamp("imposed_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_restrictions_parcel_id").on(table.parcelId)]
);

// ==========================================
// 15. AI Validations
// ==========================================
export const aiValidations = pgTable(
  "ai_validations",
  {
    id: serial("id").primaryKey(),
    validationId: varchar("validation_id", { length: 64 }).notNull().unique(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    validationType: varchar("validation_type", { length: 64 }).notNull(),
    issueTitle: text("issue_title").notNull(),
    description: text("description").notNull(),
    riskLevel: varchar("risk_level", { length: 32 }).notNull(),
    confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }).notNull(),
    aiAssisted: boolean("ai_assisted").default(true).notNull(),
    modelVersion: varchar("model_version", { length: 64 })
      .default("LandSphere-Vision-v2.4")
      .notNull(),
    flags: jsonb("flags"),
    status: varchar("status", { length: 32 }).default("Flagged").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_ai_validations_validation_id").on(table.validationId),
    index("idx_ai_validations_parcel_id").on(table.parcelId),
    index("idx_ai_validations_risk_level").on(table.riskLevel),
  ]
);

// ==========================================
// 16. Satellite Observations
// ==========================================
export const satelliteObservations = pgTable(
  "satellite_observations",
  {
    id: serial("id").primaryKey(),
    observationId: varchar("observation_id", { length: 64 }).notNull().unique(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    captureDate: timestamp("capture_date").notNull(),
    resolutionMeters: numeric("resolution_meters", { precision: 5, scale: 2 })
      .default("3.00")
      .notNull(),
    ndviBaseline: numeric("ndvi_baseline", { precision: 5, scale: 3 }),
    ndviCurrent: numeric("ndvi_current", { precision: 5, scale: 3 }),
    ndviDelta: numeric("ndvi_delta", { precision: 5, scale: 3 }),
    changeStatus: varchar("change_status", { length: 64 }).notNull(),
    changedAreaAcres: numeric("changed_area_acres", { precision: 8, scale: 2 }),
    classification: varchar("classification", { length: 64 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_satellite_obs_id").on(table.observationId),
    index("idx_satellite_obs_parcel_id").on(table.parcelId),
  ]
);

// ==========================================
// 17. Service Requests
// ==========================================
export const serviceRequests = pgTable(
  "service_requests",
  {
    id: serial("id").primaryKey(),
    requestId: varchar("request_id", { length: 64 }).notNull().unique(),
    citizenId: integer("citizen_id")
      .references(() => citizens.id, { onDelete: "restrict" })
      .notNull(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    requestType: varchar("request_type", { length: 100 }).notNull(),
    purpose: text("purpose").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    currency: varchar("currency", { length: 10 }).default("INR").notNull(),
    paymentStatus: varchar("payment_status", { length: 32 }).default("Completed").notNull(),
    status: varchar("status", { length: 32 }).default("Pending").notNull(),
    remarks: text("remarks"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_service_requests_request_id").on(table.requestId),
    index("idx_service_requests_citizen_id").on(table.citizenId),
    index("idx_service_requests_parcel_id").on(table.parcelId),
    index("idx_service_requests_status").on(table.status),
  ]
);

// ==========================================
// 18. Request Documents
// ==========================================
export const requestDocuments = pgTable(
  "request_documents",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .references(() => serviceRequests.id, { onDelete: "cascade" })
      .notNull(),
    documentName: text("document_name").notNull(),
    documentType: varchar("document_type", { length: 64 }).notNull(),
    fileUrl: text("file_url"),
    fileSizeBytes: integer("file_size_bytes"),
    mimeType: varchar("mime_type", { length: 64 }),
    verified: boolean("verified").default(false).notNull(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  },
  (table) => [index("idx_request_docs_request_id").on(table.requestId)]
);

// ==========================================
// 19. Review Cases
// ==========================================
export const reviewCases = pgTable(
  "review_cases",
  {
    id: serial("id").primaryKey(),
    caseId: varchar("case_id", { length: 64 }).notNull().unique(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "restrict" })
      .notNull(),
    requestId: integer("request_id")
      .references(() => serviceRequests.id, { onDelete: "restrict" }),
    validationId: integer("validation_id")
      .references(() => aiValidations.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    priority: varchar("priority", { length: 32 }).default("Medium").notNull(),
    status: varchar("status", { length: 32 }).default("Pending Review").notNull(),
    assignedOfficer: text("assigned_officer"),
    slaDaysRemaining: integer("sla_days_remaining").default(5).notNull(),
    recommendation: text("recommendation"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_review_cases_case_id").on(table.caseId),
    index("idx_review_cases_parcel_id").on(table.parcelId),
    index("idx_review_cases_validation_id").on(table.validationId),
    index("idx_review_cases_status").on(table.status),
  ]
);

// ==========================================
// 20. Review Events
// ==========================================
export const reviewEvents = pgTable(
  "review_events",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .references(() => reviewCases.id, { onDelete: "cascade" })
      .notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    authorName: text("author_name").notNull(),
    authorRole: varchar("author_role", { length: 64 }).notNull(),
    comments: text("comments").notNull(),
    previousStatus: varchar("previous_status", { length: 32 }),
    newStatus: varchar("new_status", { length: 32 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_review_events_case_id").on(table.caseId)]
);

// ==========================================
// 21. Notifications
// ==========================================
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    notificationId: varchar("notification_id", { length: 64 }).notNull().unique(),
    citizenId: integer("citizen_id")
      .references(() => citizens.id, { onDelete: "set null" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    audience: varchar("audience", { length: 32 }).default("citizen").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: varchar("type", { length: 32 }).default("info").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    linkUrl: text("link_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_notifications_notification_id").on(table.notificationId),
    index("idx_notifications_citizen_id").on(table.citizenId),
    index("idx_notifications_audience").on(table.audience),
    index("idx_notifications_user_id").on(table.userId),
  ]
);

// ==========================================
// 22. Reports
// ==========================================
export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    reportId: varchar("report_id", { length: 64 }).notNull().unique(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "set null" }),
    caseId: integer("case_id")
      .references(() => reviewCases.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    reportType: varchar("report_type", { length: 64 }).notNull(),
    generatedBy: text("generated_by").notNull(),
    fileFormat: varchar("file_format", { length: 16 }).default("PDF").notNull(),
    fileSize: varchar("file_size", { length: 32 }),
    downloadUrl: text("download_url"),
    generatedAt: timestamp("generated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_reports_report_id").on(table.reportId),
    index("idx_reports_parcel_id").on(table.parcelId),
  ]
);

// ==========================================
// 23. Audit Logs
// ==========================================
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    logId: varchar("log_id", { length: 64 }).notNull().unique(),
    parcelId: integer("parcel_id")
      .references(() => parcels.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }).notNull(),
    actorName: text("actor_name").notNull(),
    actorRole: varchar("actor_role", { length: 64 }).notNull(),
    details: text("details").notNull(),
    previousState: jsonb("previous_state"),
    newState: jsonb("new_state"),
    integrityHash: varchar("integrity_hash", { length: 128 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_audit_logs_log_id").on(table.logId),
    index("idx_audit_logs_parcel_id").on(table.parcelId),
    index("idx_audit_logs_created_at").on(table.createdAt),
  ]
);

// ==========================================
// Drizzle Relations
// ==========================================
export const usersRelations = relations(users, ({ one, many }) => ({
  userRoles: many(userRoles),
  citizen: one(citizens, { fields: [users.id], references: [citizens.userId] }),
  notifications: many(notifications),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const citizensRelations = relations(citizens, ({ one, many }) => ({
  user: one(users, { fields: [citizens.userId], references: [users.id] }),
  ownedParcels: many(parcelOwners),
  serviceRequests: many(serviceRequests),
  notifications: many(notifications),
}));

export const parcelsRelations = relations(parcels, ({ many }) => ({
  owners: many(parcelOwners),
  landRecords: many(landRecords),
  transactions: many(transactions),
  encumbrances: many(encumbrances),
  landUseRecords: many(landUseRecords),
  buildingPermissions: many(buildingPermissions),
  propertyTaxes: many(propertyTaxes),
  utilities: many(utilities),
  restrictions: many(restrictions),
  aiValidations: many(aiValidations),
  satelliteObservations: many(satelliteObservations),
  serviceRequests: many(serviceRequests),
  reviewCases: many(reviewCases),
  reports: many(reports),
  auditLogs: many(auditLogs),
}));

export const parcelOwnersRelations = relations(parcelOwners, ({ one }) => ({
  parcel: one(parcels, { fields: [parcelOwners.parcelId], references: [parcels.id] }),
  citizen: one(citizens, { fields: [parcelOwners.citizenId], references: [citizens.id] }),
}));

export const landRecordsRelations = relations(landRecords, ({ one }) => ({
  parcel: one(parcels, { fields: [landRecords.parcelId], references: [parcels.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  parcel: one(parcels, { fields: [transactions.parcelId], references: [parcels.id] }),
}));

export const encumbrancesRelations = relations(encumbrances, ({ one }) => ({
  parcel: one(parcels, { fields: [encumbrances.parcelId], references: [parcels.id] }),
}));

export const landUseRecordsRelations = relations(landUseRecords, ({ one }) => ({
  parcel: one(parcels, { fields: [landUseRecords.parcelId], references: [parcels.id] }),
}));

export const buildingPermissionsRelations = relations(buildingPermissions, ({ one }) => ({
  parcel: one(parcels, { fields: [buildingPermissions.parcelId], references: [parcels.id] }),
}));

export const propertyTaxesRelations = relations(propertyTaxes, ({ one }) => ({
  parcel: one(parcels, { fields: [propertyTaxes.parcelId], references: [parcels.id] }),
}));

export const utilitiesRelations = relations(utilities, ({ one }) => ({
  parcel: one(parcels, { fields: [utilities.parcelId], references: [parcels.id] }),
}));

export const restrictionsRelations = relations(restrictions, ({ one }) => ({
  parcel: one(parcels, { fields: [restrictions.parcelId], references: [parcels.id] }),
}));

export const aiValidationsRelations = relations(aiValidations, ({ one, many }) => ({
  reviewCases: many(reviewCases),
  parcel: one(parcels, { fields: [aiValidations.parcelId], references: [parcels.id] }),
}));

export const satelliteObservationsRelations = relations(satelliteObservations, ({ one }) => ({
  parcel: one(parcels, { fields: [satelliteObservations.parcelId], references: [parcels.id] }),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  citizen: one(citizens, { fields: [serviceRequests.citizenId], references: [citizens.id] }),
  parcel: one(parcels, { fields: [serviceRequests.parcelId], references: [parcels.id] }),
  documents: many(requestDocuments),
  reviewCases: many(reviewCases),
}));

export const requestDocumentsRelations = relations(requestDocuments, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [requestDocuments.requestId],
    references: [serviceRequests.id],
  }),
}));

export const reviewCasesRelations = relations(reviewCases, ({ one, many }) => ({
  validation: one(aiValidations, {
    fields: [reviewCases.validationId],
    references: [aiValidations.id],
  }),
  parcel: one(parcels, { fields: [reviewCases.parcelId], references: [parcels.id] }),
  request: one(serviceRequests, {
    fields: [reviewCases.requestId],
    references: [serviceRequests.id],
  }),
  events: many(reviewEvents),
  reports: many(reports),
}));

export const reviewEventsRelations = relations(reviewEvents, ({ one }) => ({
  case: one(reviewCases, { fields: [reviewEvents.caseId], references: [reviewCases.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  citizen: one(citizens, { fields: [notifications.citizenId], references: [citizens.id] }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  parcel: one(parcels, { fields: [reports.parcelId], references: [parcels.id] }),
  reviewCase: one(reviewCases, { fields: [reports.caseId], references: [reviewCases.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  parcel: one(parcels, { fields: [auditLogs.parcelId], references: [parcels.id] }),
}));

// ==========================================
// Inferred Types
// ==========================================
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Citizen = typeof citizens.$inferSelect;
export type InsertCitizen = typeof citizens.$inferInsert;
export type Parcel = typeof parcels.$inferSelect;
export type InsertParcel = typeof parcels.$inferInsert;
export type ParcelOwner = typeof parcelOwners.$inferSelect;
export type InsertParcelOwner = typeof parcelOwners.$inferInsert;
export type LandRecord = typeof landRecords.$inferSelect;
export type InsertLandRecord = typeof landRecords.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type AiValidation = typeof aiValidations.$inferSelect;
export type InsertAiValidation = typeof aiValidations.$inferInsert;
export type SatelliteObservation = typeof satelliteObservations.$inferSelect;
export type InsertSatelliteObservation = typeof satelliteObservations.$inferInsert;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = typeof serviceRequests.$inferInsert;
export type ReviewCase = typeof reviewCases.$inferSelect;
export type InsertReviewCase = typeof reviewCases.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;
export type Encumbrance = typeof encumbrances.$inferSelect;
export type InsertEncumbrance = typeof encumbrances.$inferInsert;
export type LandUseRecord = typeof landUseRecords.$inferSelect;
export type InsertLandUseRecord = typeof landUseRecords.$inferInsert;
export type BuildingPermission = typeof buildingPermissions.$inferSelect;
export type InsertBuildingPermission = typeof buildingPermissions.$inferInsert;
export type PropertyTax = typeof propertyTaxes.$inferSelect;
export type InsertPropertyTax = typeof propertyTaxes.$inferInsert;
export type Utility = typeof utilities.$inferSelect;
export type InsertUtility = typeof utilities.$inferInsert;
export type Restriction = typeof restrictions.$inferSelect;
export type InsertRestriction = typeof restrictions.$inferInsert;
export type RequestDocument = typeof requestDocuments.$inferSelect;
export type InsertRequestDocument = typeof requestDocuments.$inferInsert;
export type ReviewEvent = typeof reviewEvents.$inferSelect;
export type InsertReviewEvent = typeof reviewEvents.$inferInsert;

