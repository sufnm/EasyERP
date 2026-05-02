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

async function findDuplicates() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT ACC_ID, ACC_NO, ACC_NAME, ACC_LEVEL, LEVEL3_NO FROM dbo.ACCOUNTS WHERE ACC_NO = 111");
    console.table(result.recordset);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
findDuplicates();
