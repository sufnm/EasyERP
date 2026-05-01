import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

async function checkIdentity() {
  try {
    const pool = await sql.connect({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER || process.env.DB_HOST,
        database: process.env.DB_NAME,
        options: { encrypt: false, trustServerCertificate: true }
    });
    const result = await pool.request().query(`
      SELECT name, is_identity
      FROM sys.columns 
      WHERE object_id = object_id('ACCOUNTS') AND is_identity = 1
    `);
    console.table(result.recordset);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkIdentity();
