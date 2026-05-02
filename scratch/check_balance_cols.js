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

async function check() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ACCOUNTS_INFO' 
      AND COLUMN_NAME IN ('OB_DR_AMOUNT','OB_CR_AMOUNT','CB_CR_AMOUNT','CB_DR_AMOUNT')
    `);
    console.log("ACCOUNTS_INFO balance columns:");
    console.table(result.recordset);

    const r2 = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ACCOUNTS' 
      AND COLUMN_NAME IN ('OB_DR_AMOUNT','OB_CR_AMOUNT','CB_CR_AMOUNT','CB_DR_AMOUNT','OB_DEBIT','OB_CREDIT','CB_DEBIT','CB_CREDIT')
    `);
    console.log("ACCOUNTS balance columns:");
    console.table(r2.recordset);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
