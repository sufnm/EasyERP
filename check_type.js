import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: false, 
    trustServerCertificate: true 
  }
};

async function checkType() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'DATA_ENTRY' AND COLUMN_NAME = 'INVOICE_NO'
    `);
    
    console.log("TYPE_INFO:");
    console.log(JSON.stringify(result.recordset[0]));
    
    const sample = await pool.request().query("SELECT TOP 1 INVOICE_NO FROM dbo.DATA_ENTRY");
    console.log("SAMPLE_VALUE:", sample.recordset[0].INVOICE_NO);
    console.log("SAMPLE_TYPE:", typeof sample.recordset[0].INVOICE_NO);

    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

checkType();
