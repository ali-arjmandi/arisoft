CREATE TABLE "invoice_counters" (
	"series" text NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer NOT NULL,
	CONSTRAINT "invoice_counters_series_year_pk" PRIMARY KEY("series","year")
);
--> statement-breakpoint
CREATE TABLE "invoice_emails" (
	"invoice_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_try_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"series" text NOT NULL,
	"number" text NOT NULL,
	"kind" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"credits_invoice_id" text,
	"credits_number" text,
	"issued_at" timestamp with time zone NOT NULL,
	"vat_year" integer NOT NULL,
	"vat_rate" numeric(5, 2) NOT NULL,
	"vat_mode" text NOT NULL,
	"eu_cross_border" boolean NOT NULL,
	"amount_excl_vat_cents" integer NOT NULL,
	"vat_cents" integer NOT NULL,
	"amount_incl_vat_cents" integer NOT NULL,
	"buyer" jsonb NOT NULL,
	"seller" jsonb NOT NULL,
	"lines" jsonb NOT NULL,
	"payment" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_number_unique" UNIQUE("number"),
	CONSTRAINT "invoices_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "vat_alerts" (
	"scope" text NOT NULL,
	"year" integer NOT NULL,
	"level_cents" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"total_cents" integer NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vat_alerts_scope_year_level_cents_pk" PRIMARY KEY("scope","year","level_cents")
);
--> statement-breakpoint
ALTER TABLE "invoice_emails" ADD CONSTRAINT "invoice_emails_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_credits_invoice_id_invoices_id_fk" FOREIGN KEY ("credits_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_emails_status_next_try_idx" ON "invoice_emails" USING btree ("status","next_try_at");--> statement-breakpoint
CREATE INDEX "invoices_threshold_idx" ON "invoices" USING btree ("vat_year","eu_cross_border");