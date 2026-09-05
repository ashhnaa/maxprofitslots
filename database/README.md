# Database Foundation

This directory contains the PostgreSQL schema definitions and migration scripts for the **Sports Turf Profit Optimizer**.

## Files
- `schema.sql`: Contains DDL table definitions (`arenas`, `slots`, `customers`, `bookings`, `recommendations`, `campaigns`), foreign keys, CHECK constraints, and optimized indexes.
- `migrate.js`: Node.js script to create the database (`sports_turf_db`) if it doesn't exist and apply `schema.sql`.
- `verify-schema.js`: Automated test script that validates table creation, foreign keys, and constraints within a rollback transaction.

## Setup & Migration

To run database migrations from the repository:
```bash
cd backend
npm run db:migrate
```
Or directly:
```bash
node database/migrate.js
```

## Running Verification Tests
```bash
node database/verify-schema.js
```
