CREATE TABLE "email_send_state" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"is_running" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "send_attempted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "send_error" text;