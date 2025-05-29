import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Neon PostgreSQL
  },
  // Optional: you can add more config here, like max connections, idle timeout, etc.
});

export default pool;
