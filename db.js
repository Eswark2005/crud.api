// db.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Neon PostgreSQL
  },
});

// Global error handler for idle clients
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(() => console.log("✅ Connected to PostgreSQL (Neon)"))
  .catch((err) => {
    console.error("❌ Error connecting to DB at startup:", err);
    process.exit(1);
  });

export default pool;

