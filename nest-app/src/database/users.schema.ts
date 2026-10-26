import { sql } from 'drizzle-orm';
import {
  bigserial,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    emailVerifiedAt: timestamp('email_verified_at', {
      mode: 'date',
      precision: 0,
    }),
    password: varchar('password', { length: 255 }).notNull(),
    rememberToken: varchar('remember_token', { length: 100 }),
    twoFactorSecret: text('two_factor_secret'),
    twoFactorRecoveryCodes: text('two_factor_recovery_codes'),
    twoFactorConfirmedAt: timestamp('two_factor_confirmed_at', {
      mode: 'date',
      precision: 0,
    }),
    createdAt: timestamp('created_at', { mode: 'date', precision: 0 }),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 0 }),
  },
  (table) => [
    uniqueIndex('users_email_lower_unique').on(sql`lower(${table.email})`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
