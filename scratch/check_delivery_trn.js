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
    console.log("Connected to MSSQL");
    const result = await pool.request().query("SELECT * FROM TRN_TYPE WHERE TRN_NAME LIKE '%delivery%' OR TRN_NAME LIKE '%Delivery%' OR TRN_NAME LIKE '%DELIVERY%'");
    console.log("Matching TRN_TYPE rows:");
    console.log(result.recordset);
    
    const allTypes = await pool.request().query("SELECT TRN_CODE, TRN_NAME, TRN_NO FROM TRN_TYPE");
    console.log("\nAll TRN_TYPE rows:");
    console.log(allTypes.recordset);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
