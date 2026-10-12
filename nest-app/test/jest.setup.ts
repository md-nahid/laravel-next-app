import 'dotenv/config';

const databaseUrl = new URL(
  process.env.DATABASE_URL ??
    'postgresql://nest:nest_dev_password@localhost:5433/nest_app_test',
);

if (
  databaseUrl.pathname !== '/nest_app' &&
  databaseUrl.pathname !== '/nest_app_test'
) {
  throw new Error(
    'Nest e2e tests require a Nest database URL; refusing to run against any database other than nest_app or nest_app_test.',
  );
}

databaseUrl.pathname = '/nest_app_test';
process.env.DATABASE_URL = databaseUrl.toString();
