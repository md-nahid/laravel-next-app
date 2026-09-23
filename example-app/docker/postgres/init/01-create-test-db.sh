#!/bin/bash
set -euo pipefail

# Create a dedicated database for the PHPUnit test suite, owned by the
# same Laravel user that the application uses for development.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE example_app_testing OWNER ${POSTGRES_USER};
EOSQL
