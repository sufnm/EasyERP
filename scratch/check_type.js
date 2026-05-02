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

async function checkType() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT type_desc FROM sys.objects WHERE name = 'ACCOUNTS'
    `);
    console.log("Type of ACCOUNTS:", result.recordset);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkType();
