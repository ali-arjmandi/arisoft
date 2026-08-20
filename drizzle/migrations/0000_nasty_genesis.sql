CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"kvk_number" text,
	"analysis" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails_sent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contact_person_id" uuid,
	"contact_name_snapshot" text,
	"contact_email_snapshot" text NOT NULL,
	"from_sender" text NOT NULL,
	"content" jsonb NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_persons" ADD CONSTRAINT "contact_persons_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails_sent" ADD CONSTRAINT "emails_sent_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails_sent" ADD CONSTRAINT "emails_sent_contact_person_id_contact_persons_id_fk" FOREIGN KEY ("contact_person_id") REFERENCES "public"."contact_persons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_persons_company_id_idx" ON "contact_persons" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "emails_sent_company_id_idx" ON "emails_sent" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "emails_sent_contact_person_id_idx" ON "emails_sent" USING btree ("contact_person_id");