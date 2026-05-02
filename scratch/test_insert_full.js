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

async function testInsertFull() {
  try {
    const pool = await sql.connect(dbConfig);
    const q = `
      INSERT INTO dbo.ACCOUNTS (
        ACC_NO, ACC_NAME, ACC_ANAME, ACC_CLASS, ACC_LEVEL, 
        GROUP_AC, PREFEX_NO, LEVEL1_NO, LEVEL2_NO, LEVEL3_NO, 
        ISPERMENENT, ACC_CODE, ACC_TYPE_CODE, CREATE_TIME
      )
      VALUES (
        9998, 'Test Full', 'Test Full Arabic', 1, 4, 
        0, NULL, '1', '11', '114', 
        0, 'testcode', 1, GETDATE()
      )
    `;
    await pool.request().query(q);
    console.log("Full Insert success!");
  } catch (e) {
    console.error("Full Manual Insert Fail:", e.message);
  } finally {
    process.exit();
  }
}
testInsertFull();
