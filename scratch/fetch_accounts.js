import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: { encrypt: false, trustServerCertificate: true }
};

async function fetchAccounts() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT TOP 50 * FROM dbo.ACCOUNTS');
    console.log(JSON.stringify(result.recordset, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
fetchAccounts();
