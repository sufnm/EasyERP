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

async function testFetch() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('parentId', sql.NVarChar(50), '111')
      .query(`
        SELECT ACC_NO, ACC_NAME, ACC_LEVEL 
        FROM dbo.ACCOUNTS 
        WHERE LEVEL3_NO = @parentId AND ACC_LEVEL = 4
      `);
    console.table(result.recordset);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
testFetch();
