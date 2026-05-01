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

async function test() {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Check columns of ACCOUNTS
    const cols = await pool.request().query("SELECT TOP 0 * FROM dbo.ACCOUNTS");
    console.log('ACCOUNTS Columns:', Object.keys(cols.recordset.columns));

    // Try a broad search for level 2 accounts
    const sample = await pool.request().query("SELECT TOP 5 ACC_NO, ACC_NAME, ACC_CLASS, ACC_LEVEL FROM dbo.ACCOUNTS WHERE ACC_LEVEL = 2");
    console.log('Sample Level 2 Accounts:', sample.recordset);

    // Try specifically for class 1 (usually Assets)
    const class1 = await pool.request().query("SELECT TOP 5 ACC_NO, ACC_NAME, ACC_CLASS, ACC_LEVEL FROM dbo.ACCOUNTS WHERE ACC_CLASS = 1 AND ACC_LEVEL = 2");
    console.log('Class 1 Level 2 Accounts:', class1.recordset);
    
    await sql.close();
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

test();
