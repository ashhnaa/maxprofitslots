const fs = require('fs');
const path = require('path');

// Resolve dependencies from backend/node_modules
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { Client } = require(path.join(__dirname, '../backend/node_modules/pg'));

const dbName = process.env.PGDATABASE || process.env.DB_NAME || 'sports_turf_db';
const user = process.env.PGUSER || process.env.DB_USER || 'postgres';
const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres';
const host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10);

async function initDatabase() {
  console.log(`Connecting to PostgreSQL server on ${host}:${port}...`);
  
  // Step 1: Connect to default postgres DB to ensure target database exists
  const adminClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres'
  });

  try {
    await adminClient.connect();
    const res = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (res.rowCount === 0) {
      console.log(`Database "${dbName}" does not exist. Creating it now...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('Error connecting to administrative postgres database:', err.message);
    throw err;
  } finally {
    await adminClient.end();
  }

  // Step 2: Connect to target database and apply schema.sql
  console.log(`Applying schema to "${dbName}"...`);
  const targetClient = new Client({
    host,
    port,
    user,
    password,
    database: dbName
  });

  try {
    await targetClient.connect();
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await targetClient.query(schemaSql);
    console.log('✅ Schema migration completed successfully!');
  } catch (err) {
    console.error('Error applying schema:', err.message);
    throw err;
  } finally {
    await targetClient.end();
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Database initialization complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
}

module.exports = initDatabase;
