ALTER TABLE "emails" ALTER COLUMN "sent_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "emails" ALTER COLUMN "sent_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;