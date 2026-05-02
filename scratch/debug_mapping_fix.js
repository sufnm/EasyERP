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

async function debugMapping() {
  try {
    const pool = await sql.connect(dbConfig);
    const policy = await pool.request().query('SELECT CASH_AC_TYPE FROM dbo.AC_OPTIONS WHERE ID = 1');
    const headerId = policy.recordset[0]?.CASH_AC_TYPE;
    
    console.log("DEBUG: CASH_AC_TYPE from AC_OPTIONS:", headerId);
    
    if (headerId) {
        const accInfo = await pool.request()
            .input('hid', sql.Numeric(18,0), headerId)
            .query('SELECT ACC_NAME, LEVEL2_NO, ACC_LEVEL FROM dbo.ACCOUNTS WHERE ACC_NO = @hid');
        console.log("DEBUG: Header Account Details:");
        console.table(accInfo.recordset);
        
        if (accInfo.recordset[0]) {
            const subId = accInfo.recordset[0].LEVEL2_NO;
            const subInfo = await pool.request()
                .input('sid', sql.Numeric(18,0), subId)
                .query('SELECT ACC_NAME FROM dbo.ACCOUNTS WHERE ACC_NO = @sid');
            console.log("DEBUG: Sub Class Name:", subInfo.recordset[0]?.ACC_NAME);
        }
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
debugMapping();
