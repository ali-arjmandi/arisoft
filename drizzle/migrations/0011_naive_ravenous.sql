ALTER TABLE "email_send_state" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "queue_state" ADD COLUMN "locked_at" timestamp with time zone;