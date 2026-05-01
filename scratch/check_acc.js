import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

async function checkData() {
  try {
    const pool = await sql.connect({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER || process.env.DB_HOST,
        database: process.env.DB_NAME,
        options: { encrypt: false, trustServerCertificate: true }
    });
    const result = await pool.request().query(`
      SELECT TOP 5 ACC_NO, ACC_NAME, ACC_TYPE_CODE, ACC_CLASS, ACC_LEVEL, LEVEL1_NO, LEVEL2_NO, LEVEL3_NO, LEVEL4_NO
      FROM ACCOUNTS
      ORDER BY ACC_NO DESC
    `);
    console.table(result.recordset);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkData();
