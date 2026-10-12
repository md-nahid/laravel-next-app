CREATE TABLE "conversation_deletions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"partner_id" bigint NOT NULL,
	"deleted_through_message_id" bigint,
	"created_at" timestamp (0),
	"updated_at" timestamp (0),
	CONSTRAINT "conversation_deletions_user_id_partner_id_unique" UNIQUE("user_id","partner_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sender_id" bigint NOT NULL,
	"receiver_id" bigint NOT NULL,
	"message" varchar(500) NOT NULL,
	"created_at" timestamp (0),
	"updated_at" timestamp (0)
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"email" varchar(255) PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"created_at" timestamp (0)
);
--> statement-breakpoint
CREATE TABLE "personal_access_tokens" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tokenable_type" varchar(255) NOT NULL,
	"tokenable_id" bigint NOT NULL,
	"name" text NOT NULL,
	"token" varchar(64) NOT NULL,
	"abilities" text,
	"last_used_at" timestamp (0),
	"expires_at" timestamp (0),
	"created_at" timestamp (0),
	"updated_at" timestamp (0),
	CONSTRAINT "personal_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"ip_address" varchar(45),
	"user_agent" text,
	"payload" text NOT NULL,
	"last_activity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"blocker_id" bigint NOT NULL,
	"blocked_id" bigint NOT NULL,
	"created_at" timestamp (0),
	"updated_at" timestamp (0),
	CONSTRAINT "user_blocks_blocker_id_blocked_id_unique" UNIQUE("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified_at" timestamp (0),
	"password" varchar(255) NOT NULL,
	"remember_token" varchar(100),
	"two_factor_secret" text,
	"two_factor_recovery_codes" text,
	"two_factor_confirmed_at" timestamp (0),
	"created_at" timestamp (0),
	"updated_at" timestamp (0),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "conversation_deletions" ADD CONSTRAINT "conversation_deletions_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_deletions" ADD CONSTRAINT "conversation_deletions_partner_id_foreign" FOREIGN KEY ("partner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_sender_id_foreign" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_receiver_id_foreign" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_foreign" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_foreign" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "personal_access_tokens_tokenable_type_tokenable_id_index" ON "personal_access_tokens" USING btree ("tokenable_type","tokenable_id");--> statement-breakpoint
CREATE INDEX "personal_access_tokens_expires_at_index" ON "personal_access_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_index" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_last_activity_index" ON "sessions" USING btree ("last_activity");--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_id_index" ON "user_blocks" USING btree ("blocked_id");