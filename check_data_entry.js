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

async function checkTable() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log("✅ Connected. Checking dbo.DATA_ENTRY...");
    
    // Check if table exists and get columns
    const result = await pool.request().query(`
      SELECT TOP 1 * FROM dbo.DATA_ENTRY
    `);
    
    if (result.recordset.length > 0) {
      console.log("✅ Success! Columns:", Object.keys(result.recordset[0]));
      console.log("Sample Data:", result.recordset[0]);
    } else {
      console.log("⚠️ Table exists but is empty.");
      // Check column names from sys tables
      const columns = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'DATA_ENTRY'
      `);
      console.log("Column names:", columns.recordset.map(c => c.COLUMN_NAME));
    }
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

checkTable();
