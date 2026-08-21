CREATE TABLE "company_queue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"kvk_number" text,
	"status" text DEFAULT 'waiting' NOT NULL,
	"error_message" text,
	"company_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_state" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"is_running" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emails_sent" RENAME TO "emails";--> statement-breakpoint
ALTER TABLE "emails" DROP CONSTRAINT "emails_sent_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "emails" DROP CONSTRAINT "emails_sent_contact_person_id_contact_persons_id_fk";
--> statement-breakpoint
DROP INDEX "emails_sent_company_id_idx";--> statement-breakpoint
DROP INDEX "emails_sent_contact_person_id_idx";--> statement-breakpoint
ALTER TABLE "company_queue_items" ADD CONSTRAINT "company_queue_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_queue_items_status_created_at_idx" ON "company_queue_items" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "company_queue_items_company_id_idx" ON "company_queue_items" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_contact_person_id_contact_persons_id_fk" FOREIGN KEY ("contact_person_id") REFERENCES "public"."contact_persons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emails_company_id_idx" ON "emails" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "emails_contact_person_id_idx" ON "emails" USING btree ("contact_person_id");