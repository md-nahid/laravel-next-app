ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
CREATE INDEX "conversations_sender_id_receiver_id_id_index" ON "conversations" USING btree ("sender_id","receiver_id","id");--> statement-breakpoint
CREATE INDEX "conversations_receiver_id_sender_id_id_index" ON "conversations" USING btree ("receiver_id","sender_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" USING btree (lower("email"));