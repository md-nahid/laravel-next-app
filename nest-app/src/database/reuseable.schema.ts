import { timestamp } from 'drizzle-orm/pg-core';
export const timestamps = () => ({
  createdAt: timestamp('created_at', { mode: 'date', precision: 0 }),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 0 }),
});
