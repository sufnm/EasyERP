import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  server: process.env.DB_SERVER || 'localhost',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Eazy@123',
  database: process.env.DB_NAME || 'EazySoftDB',
  options: { encrypt: false, trustServerCertificate: true }
};

async function check() {
  const pool = await sql.connect(config);
  const result = await pool.request().query('SELECT TOP 1 * FROM DATA_ENTRY');
  console.log(Object.keys(result.recordset[0]).join(', '));
  process.exit(0);
}
check();
