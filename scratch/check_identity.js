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

async function checkIdentity() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT name FROM sys.columns 
      WHERE object_id = OBJECT_ID('ACCOUNTS') 
      AND is_identity = 1
    `);
    console.log("Identity columns on ACCOUNTS:", result.recordset);

    const result2 = await pool.request().query(`
      SELECT name FROM sys.columns 
      WHERE object_id = OBJECT_ID('TRN_ACCOUNTS') 
      AND is_identity = 1
    `);
    console.log("Identity columns on TRN_ACCOUNTS:", result2.recordset);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkIdentity();
