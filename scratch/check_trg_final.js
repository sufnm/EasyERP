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

async function checkTrgAgain() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT OBJECT_NAME(m.object_id) AS Parent, name as TrgName, definition 
      FROM sys.sql_modules m
      JOIN sys.triggers t ON m.object_id = t.object_id
      WHERE m.definition LIKE '%TRN_ACCOUNTS%'
    `);
    console.table(result.recordset.map(r => ({ Parent: r.Parent, Name: r.TrgName })));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkTrgAgain();
