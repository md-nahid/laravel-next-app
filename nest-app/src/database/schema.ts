import {
  bigint,
  bigserial,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  conversationDeletions,
  conversations,
  userBlocks,
} from './conversations.schema';
import { timestamps } from './reuseable.schema';
import { users } from './users.schema';

export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    payload: text('payload').notNull(),
    lastActivity: integer('last_activity').notNull(),
  },
  (table) => [
    index('sessions_user_id_index').on(table.userId),
    index('sessions_last_activity_index').on(table.lastActivity),
  ],
);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  email: varchar('email', { length: 255 }).primaryKey(),
  token: varchar('token', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 0 }),
});

export const personalAccessTokens = pgTable(
  'personal_access_tokens',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tokenableType: varchar('tokenable_type', { length: 255 }).notNull(),
    tokenableId: bigint('tokenable_id', { mode: 'number' }).notNull(),
    name: text('name').notNull(),
    token: varchar('token', { length: 64 }).notNull(),
    abilities: text('abilities'),
    lastUsedAt: timestamp('last_used_at', { mode: 'date', precision: 0 }),
    expiresAt: timestamp('expires_at', { mode: 'date', precision: 0 }),
    ...timestamps(),
  },
  (table) => [
    unique('personal_access_tokens_token_unique').on(table.token),
    index('personal_access_tokens_tokenable_type_tokenable_id_index').on(
      table.tokenableType,
      table.tokenableId,
    ),
    index('personal_access_tokens_expires_at_index').on(table.expiresAt),
  ],
);

export const schema = {
  users,
  sessions,
  passwordResetTokens,
  personalAccessTokens,
  conversations,
  userBlocks,
  conversationDeletions,
};
