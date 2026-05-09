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
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT TRN_CODE, TRN_NAME, TRN_ANAME, SCREEN_NAME FROM dbo.TRN_TYPE WHERE TRN_NAME LIKE '%Quotation%' OR TRN_NAME LIKE '%Quote%' OR TRN_ANAME LIKE '%Quotation%'");
    console.log("Transaction types matching 'Quotation' or 'Quote':");
    console.log(result.recordset);
    
    const allResult = await pool.request().query("SELECT TRN_CODE, TRN_NAME, SCREEN_NAME FROM dbo.TRN_TYPE");
    console.log("\nAll transaction types:");
    console.log(allResult.recordset);
    
    process.exit(0);
  } catch (error) {
    console.error("Error executing query:", error);
    process.exit(1);
  }
}
check();
