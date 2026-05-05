import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

// MSSQL connection configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 15000, // 15 seconds
    requestTimeout: 30000     // 30 seconds
  }
};

let pool;

/**
 * Centralized function to get or create the MSSQL connection pool
 */
export async function getPool() {
  if (pool) return pool;
  try {
    console.log(`📡 Attempting to connect to database on server: ${dbConfig.server}`);
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to MSSQL');
    return pool;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    throw err;
  }
}

// Export the sql object for type definitions and helper methods
export { sql };
