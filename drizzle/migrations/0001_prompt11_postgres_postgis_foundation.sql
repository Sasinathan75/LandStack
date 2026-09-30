ALTER TABLE "reports" DROP CONSTRAINT "reports_parcel_id_parcels_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "parcel_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "citizens" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "review_cases" ADD COLUMN "validation_id" integer;--> statement-breakpoint
ALTER TABLE "citizens" ADD CONSTRAINT "citizens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_cases" ADD CONSTRAINT "review_cases_validation_id_ai_validations_id_fk" FOREIGN KEY ("validation_id") REFERENCES "public"."ai_validations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_citizens_user_id" ON "citizens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_review_cases_validation_id" ON "review_cases" USING btree ("validation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_roles_user_role" ON "user_roles" USING btree ("user_id","role_id");