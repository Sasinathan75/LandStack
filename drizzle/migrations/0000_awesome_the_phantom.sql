CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE TABLE "ai_validations" (
	"id" serial PRIMARY KEY NOT NULL,
	"validation_id" varchar(64) NOT NULL,
	"parcel_id" integer NOT NULL,
	"validation_type" varchar(64) NOT NULL,
	"issue_title" text NOT NULL,
	"description" text NOT NULL,
	"risk_level" varchar(32) NOT NULL,
	"confidence_score" numeric(5, 2) NOT NULL,
	"ai_assisted" boolean DEFAULT true NOT NULL,
	"model_version" varchar(64) DEFAULT 'LandSphere-Vision-v2.4' NOT NULL,
	"flags" jsonb,
	"status" varchar(32) DEFAULT 'Flagged' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_validations_validation_id_unique" UNIQUE("validation_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"log_id" varchar(64) NOT NULL,
	"parcel_id" integer,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" varchar(64) NOT NULL,
	"actor_name" text NOT NULL,
	"actor_role" varchar(64) NOT NULL,
	"details" text NOT NULL,
	"previous_state" jsonb,
	"new_state" jsonb,
	"integrity_hash" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_log_id_unique" UNIQUE("log_id")
);
--> statement-breakpoint
CREATE TABLE "building_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"parcel_id" integer NOT NULL,
	"permit_number" varchar(64) NOT NULL,
	"permit_type" varchar(64) NOT NULL,
	"structure_type" varchar(64),
	"proposed_floors" integer,
	"proposed_area_sq_ft" numeric(10, 2),
	"status" varchar(64) DEFAULT 'Approved' NOT NULL,
	"applied_date" timestamp,
	"approved_date" timestamp,
	"expiry_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "building_permissions_permit_number_unique" UNIQUE("permit_number")
);
--> statement-breakpoint
CREATE TABLE "citizens" (
	"id" serial PRIMARY KEY NOT NULL,
	"citizen_id" varchar(64) NOT NULL,
	"full_name" text NOT NULL,
	"email" varchar(320),
	"phone" varchar(32),
	"aadhaar_masked" varchar(32),
	"pan_masked" varchar(32),
	"address" text,
	"district" varchar(100),
	"state" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "citizens_citizen_id_unique" UNIQUE("citizen_id")
);
--> statement-breakpoint
CREATE TABLE "encumbrances" (
	"id" serial PRIMARY KEY NOT NULL,
	"parcel_id" integer NOT NULL,
	"encumbrance_type" varchar(64) NOT NULL,
	"holder_name" text NOT NULL,
	"amount" numeric(14, 2),
	"status" varchar(64) DEFAULT 'Active' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "land_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_number" varchar(64) NOT NULL,
	"parcel_id" integer NOT NULL,
	"record_type" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"issue_date" timestamp,
	"issuing_authority" text,
	"status" varchar(64) DEFAULT 'Verified' NOT NULL,
	"document_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "land_records_record_number_unique" UNIQUE("record_number")
);
--> statement-breakpoint
CREATE TABLE "land_use_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"parcel_id" integer NOT NULL,
	"recorded_land_use" varchar(64) NOT NULL,
	"actual_land_use" varchar(64) NOT NULL,
	"zoning_category" varchar(64),
	"master_plan_zone" varchar(64),
	"mismatch_detected" boolean DEFAULT false NOT NULL,
	"source" varchar(64) DEFAULT 'Revenue Department' NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" varchar(64) NOT NULL,
	"citizen_id" integer,
	"audience" varchar(32) DEFAULT 'citizen' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" varchar(32) DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"link_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_notification_id_unique" UNIQUE("notification_id")
);
--> statement-breakpoint
CREATE TABLE "parcel_owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"parcel_id" integer NOT NULL,
	"citizen_id" integer NOT NULL,
	"ownership_percentage" numeric(5, 2) DEFAULT '100.00' NOT NULL,
	"ownership_type" varchar(64) DEFAULT 'Sole Owner' NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcels" (
	"id" serial PRIMARY KEY NOT NULL,
	"parcel_id" varchar(64) NOT NULL,
	"ulpin" varchar(64) NOT NULL,
	"survey_number" varchar(64) NOT NULL,
	"area_acres" numeric(10, 2) NOT NULL,
	"land_use" varchar(64) NOT NULL,
	"location" text NOT NULL,
	"district" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"status" varchar(64) DEFAULT 'Active' NOT NULL,
	"risk_level" varchar(32) DEFAULT 'Low' NOT NULL,
	"geometry" geometry(Polygon, 4326),
	"geojson" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parcels_parcel_id_unique" UNIQUE("parcel_id"),
	CONSTRAINT "parcels_ulpin_unique" UNIQUE("ulpin")
);
--> statement-breakpoint
CREATE TABLE "property_taxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"parcel_id" integer NOT NULL,
	"tax_receipt_number" varchar(64) NOT NULL,
	"assessment_year" varchar(16) NOT NULL,
	"amount_due" numeric(10, 2) NOT NULL,
	"amount_paid" numeric(10, 2) NOT NULL,
	"payment_status" varchar(32) DEFAULT 'Paid' NOT NULL,
	"due_date" timestamp,
	"paid_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "property_taxes_tax_receipt_number_unique" UNIQUE("tax_receipt_number")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"file_size" varchar(32),
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" varchar(64) NOT NULL,
	"parcel_id" integer NOT NULL,
	"case_id" integer,
	"title" text NOT NULL,
	"report_type" varchar(64) NOT NULL,
	"generated_by" text NOT NULL,
	"file_format" varchar(16) DEFAULT 'PDF' NOT NULL,
	"download_url" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reports_report_id_unique" UNIQUE("report_id")
);
--> statement-breakpoint
CREATE TABLE "request_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"document_name" text NOT NULL,
	"document_type" varchar(64) NOT NULL,
	"file_url" text,
	"file_size_bytes" integer,
	"mime_type" varchar(64),
	"verified" boolean DEFAULT false NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restrictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"parcel_id" integer NOT NULL,
	"restriction_type" varchar(64) NOT NULL,
	"description" text NOT NULL,
	"severity" varchar(32) DEFAULT 'Medium' NOT NULL,
	"status" varchar(32) DEFAULT 'Active' NOT NULL,
	"imposed_by" text,
	"imposed_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" varchar(64) NOT NULL,
	"parcel_id" integer NOT NULL,
	"request_id" integer,
	"title" text NOT NULL,
	"priority" varchar(32) DEFAULT 'Medium' NOT NULL,
	"status" varchar(32) DEFAULT 'Pending Review' NOT NULL,
	"assigned_officer" text,
	"sla_days_remaining" integer DEFAULT 5 NOT NULL,
	"recommendation" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_cases_case_id_unique" UNIQUE("case_id")
);
--> statement-breakpoint
CREATE TABLE "review_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"author_name" text NOT NULL,
	"author_role" varchar(64) NOT NULL,
	"comments" text NOT NULL,
	"previous_status" varchar(32),
	"new_status" varchar(32),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "satellite_observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"observation_id" varchar(64) NOT NULL,
	"parcel_id" integer NOT NULL,
	"provider" varchar(64) NOT NULL,
	"capture_date" timestamp NOT NULL,
	"resolution_meters" numeric(5, 2) DEFAULT '3.00' NOT NULL,
	"ndvi_baseline" numeric(5, 3),
	"ndvi_current" numeric(5, 3),
	"ndvi_delta" numeric(5, 3),
	"change_status" varchar(64) NOT NULL,
	"changed_area_acres" numeric(8, 2),
	"classification" varchar(64),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "satellite_observations_observation_id_unique" UNIQUE("observation_id")
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" varchar(64) NOT NULL,
	"citizen_id" integer NOT NULL,
	"parcel_id" integer NOT NULL,
	"request_type" varchar(100) NOT NULL,
	"purpose" text NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"payment_status" varchar(32) DEFAULT 'Completed' NOT NULL,
	"status" varchar(32) DEFAULT 'Pending' NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_requests_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" varchar(64) NOT NULL,
	"parcel_id" integer NOT NULL,
	"transaction_type" varchar(64) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"buyer_name" text NOT NULL,
	"seller_name" text NOT NULL,
	"registration_deed_number" varchar(64),
	"status" varchar(64) DEFAULT 'Registered' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" varchar(32) DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
CREATE TABLE "utilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"parcel_id" integer NOT NULL,
	"utility_type" varchar(64) NOT NULL,
	"connection_status" varchar(32) DEFAULT 'Connected' NOT NULL,
	"consumer_number" varchar(64),
	"provider" text,
	"connected_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_validations" ADD CONSTRAINT "ai_validations_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building_permissions" ADD CONSTRAINT "building_permissions_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_records" ADD CONSTRAINT "land_records_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_use_records" ADD CONSTRAINT "land_use_records_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_citizen_id_citizens_id_fk" FOREIGN KEY ("citizen_id") REFERENCES "public"."citizens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_owners" ADD CONSTRAINT "parcel_owners_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_owners" ADD CONSTRAINT "parcel_owners_citizen_id_citizens_id_fk" FOREIGN KEY ("citizen_id") REFERENCES "public"."citizens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_taxes" ADD CONSTRAINT "property_taxes_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_case_id_review_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."review_cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_documents" ADD CONSTRAINT "request_documents_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restrictions" ADD CONSTRAINT "restrictions_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_cases" ADD CONSTRAINT "review_cases_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_cases" ADD CONSTRAINT "review_cases_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_case_id_review_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."review_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "satellite_observations" ADD CONSTRAINT "satellite_observations_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_citizen_id_citizens_id_fk" FOREIGN KEY ("citizen_id") REFERENCES "public"."citizens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utilities" ADD CONSTRAINT "utilities_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ai_validations_validation_id" ON "ai_validations" USING btree ("validation_id");--> statement-breakpoint
CREATE INDEX "idx_ai_validations_parcel_id" ON "ai_validations" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "idx_ai_validations_risk_level" ON "ai_validations" USING btree ("risk_level");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_audit_logs_log_id" ON "audit_logs" USING btree ("log_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_parcel_id" ON "audit_logs" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_building_permissions_permit_number" ON "building_permissions" USING btree ("permit_number");--> statement-breakpoint
CREATE INDEX "idx_building_permissions_parcel_id" ON "building_permissions" USING btree ("parcel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_citizens_citizen_id" ON "citizens" USING btree ("citizen_id");--> statement-breakpoint
CREATE INDEX "idx_citizens_email" ON "citizens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_encumbrances_parcel_id" ON "encumbrances" USING btree ("parcel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_land_records_record_number" ON "land_records" USING btree ("record_number");--> statement-breakpoint
CREATE INDEX "idx_land_records_parcel_id" ON "land_records" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "idx_land_use_records_parcel_id" ON "land_use_records" USING btree ("parcel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_notifications_notification_id" ON "notifications" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_citizen_id" ON "notifications" USING btree ("citizen_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_audience" ON "notifications" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "idx_parcel_owners_parcel_id" ON "parcel_owners" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "idx_parcel_owners_citizen_id" ON "parcel_owners" USING btree ("citizen_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_parcels_parcel_id" ON "parcels" USING btree ("parcel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_parcels_ulpin" ON "parcels" USING btree ("ulpin");--> statement-breakpoint
CREATE INDEX "idx_parcels_land_use" ON "parcels" USING btree ("land_use");--> statement-breakpoint
CREATE INDEX "idx_parcels_status" ON "parcels" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_parcels_risk_level" ON "parcels" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "idx_parcels_geometry_gist" ON "parcels" USING gist ("geometry");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_property_taxes_receipt" ON "property_taxes" USING btree ("tax_receipt_number");--> statement-breakpoint
CREATE INDEX "idx_property_taxes_parcel_id" ON "property_taxes" USING btree ("parcel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reports_report_id" ON "reports" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "idx_reports_parcel_id" ON "reports" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "idx_request_docs_request_id" ON "request_documents" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_restrictions_parcel_id" ON "restrictions" USING btree ("parcel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_review_cases_case_id" ON "review_cases" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "idx_review_cases_parcel_id" ON "review_cases" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "idx_review_cases_status" ON "review_cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_review_events_case_id" ON "review_events" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_roles_name" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_satellite_obs_id" ON "satellite_observations" USING btree ("observation_id");--> statement-breakpoint
CREATE INDEX "idx_satellite_obs_parcel_id" ON "satellite_observations" USING btree ("parcel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_service_requests_request_id" ON "service_requests" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_service_requests_citizen_id" ON "service_requests" USING btree ("citizen_id");--> statement-breakpoint
CREATE INDEX "idx_service_requests_parcel_id" ON "service_requests" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "idx_service_requests_status" ON "service_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_transactions_transaction_id" ON "transactions" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_parcel_id" ON "transactions" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_user_id" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_role_id" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_open_id" ON "users" USING btree ("open_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_utilities_parcel_id" ON "utilities" USING btree ("parcel_id");