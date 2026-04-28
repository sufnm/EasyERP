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

async function checkCols() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT TOP 1 * FROM dbo.DATA_ENTRY
    `);
    
    if (result.recordset.length > 0) {
      console.log("COLUMNS_LIST:");
      console.log(JSON.stringify(Object.keys(result.recordset[0])));
    } else {
      console.log("TABLE_EMPTY");
      const columns = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'DATA_ENTRY'
      `);
      console.log("COLUMNS_LIST:");
      console.log(JSON.stringify(columns.recordset.map(c => c.COLUMN_NAME)));
    }
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

checkCols();
