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

async function testInsert() {
  try {
    const pool = await sql.connect(dbConfig);
    const q = `
      INSERT INTO dbo.ACCOUNTS (
        ACC_NO, ACC_NAME, ACC_TYPE_CODE
      ) VALUES (9999, 'Test Manual', 1)
    `;
    await pool.request().query(q);
    console.log("Insert success!");
  } catch (e) {
    console.error("Manual Insert Fail:", e.message);
  } finally {
    process.exit();
  }
}
testInsert();
