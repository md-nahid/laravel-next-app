import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const configuredUrl = process.env.DATABASE_URL;

if (!configuredUrl) {
  throw new Error(
    'DATABASE_URL must be set to the Nest database before preparing the test database.',
  );
}

const testDatabaseUrl = new URL(configuredUrl);
if (
  testDatabaseUrl.pathname !== '/nest_app' &&
  testDatabaseUrl.pathname !== '/nest_app_test'
) {
  throw new Error(
    'Refusing to migrate the test schema from a URL that does not target the Nest database.',
  );
}
testDatabaseUrl.pathname = '/nest_app_test';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/**/*.ts',
  out: './drizzle',
  dbCredentials: {
    url: testDatabaseUrl.toString(),
  },
});
