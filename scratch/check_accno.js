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

async function checkAccNoIdentity() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, COLUMNPROPERTY(OBJECT_ID('ACCOUNTS'), COLUMN_NAME, 'IsIdentity') AS IsIdentity
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'ACCOUNTS' AND COLUMN_NAME = 'ACC_NO'
    `);
    console.log("ACC_NO Identity Check:", result.recordset);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkAccNoIdentity();
