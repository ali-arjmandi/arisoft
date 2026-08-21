-- emails: add explicit status, backfilled from the existing sent_at column.
-- Every pre-existing row predates the "draft" concept, so it can only
-- become 'sent' or 'queued', never 'draft'.
ALTER TABLE "emails" ADD COLUMN "status" text;--> statement-breakpoint
UPDATE "emails" SET "status" = CASE WHEN "sent_at" IS NOT NULL THEN 'sent' ELSE 'queued' END;--> statement-breakpoint
ALTER TABLE "emails" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "emails" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint

-- queue_state: add the 3-way mode column, backfilled from the existing
-- boolean toggle (dropped in the next migration once this is confirmed).
ALTER TABLE "queue_state" ADD COLUMN "generate_emails_mode" text;--> statement-breakpoint
UPDATE "queue_state" SET "generate_emails_mode" = CASE WHEN "generate_emails" THEN 'queued' ELSE 'off' END;--> statement-breakpoint
ALTER TABLE "queue_state" ALTER COLUMN "generate_emails_mode" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "queue_state" ALTER COLUMN "generate_emails_mode" SET DEFAULT 'queued';
