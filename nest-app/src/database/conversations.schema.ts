import {
  bigint,
  bigserial,
  foreignKey,
  index,
  pgTable,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { timestamps } from './reuseable.schema';
import { users } from './users.schema';

export const conversations = pgTable(
  'conversations',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    senderId: bigint('sender_id', { mode: 'number' }).notNull(),
    receiverId: bigint('receiver_id', { mode: 'number' }).notNull(),
    message: varchar('message', { length: 500 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 0 }),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 0 }),
  },
  (table) => [
    foreignKey({
      columns: [table.senderId],
      foreignColumns: [users.id],
      name: 'conversations_sender_id_foreign',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.receiverId],
      foreignColumns: [users.id],
      name: 'conversations_receiver_id_foreign',
    }).onDelete('cascade'),
  ],
);

export const conversationDeletions = pgTable(
  'conversation_deletions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    partnerId: bigint('partner_id', { mode: 'number' }).notNull(),
    deletedThroughMessageId: bigint('deleted_through_message_id', {
      mode: 'number',
    }),
    ...timestamps(),
  },
  (table) => [
    unique('conversation_deletions_user_id_partner_id_unique').on(
      table.userId,
      table.partnerId,
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'conversation_deletions_user_id_foreign',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [users.id],
      name: 'conversation_deletions_partner_id_foreign',
    }).onDelete('cascade'),
  ],
);

export const userBlocks = pgTable(
  'user_blocks',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    blockerId: bigint('blocker_id', { mode: 'number' }).notNull(),
    blockedId: bigint('blocked_id', { mode: 'number' }).notNull(),
    ...timestamps(),
  },
  (table) => [
    unique('user_blocks_blocker_id_blocked_id_unique').on(
      table.blockerId,
      table.blockedId,
    ),
    index('user_blocks_blocked_id_index').on(table.blockedId),
    foreignKey({
      columns: [table.blockerId],
      foreignColumns: [users.id],
      name: 'user_blocks_blocker_id_foreign',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.blockedId],
      foreignColumns: [users.id],
      name: 'user_blocks_blocked_id_foreign',
    }).onDelete('cascade'),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ConversationDeletion = typeof conversationDeletions.$inferSelect;
