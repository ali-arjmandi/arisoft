CREATE TABLE "inbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailbox" text NOT NULL,
	"uid" integer NOT NULL,
	"thread_id" text NOT NULL,
	"message_id" text,
	"references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"from_name" text,
	"from_address" text,
	"reply_to_address" text,
	"subject" text NOT NULL,
	"body_text" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_messages_mailbox_uid_idx" ON "inbox_messages" USING btree ("mailbox","uid");--> statement-breakpoint
CREATE INDEX "inbox_messages_mailbox_thread_id_idx" ON "inbox_messages" USING btree ("mailbox","thread_id");