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

async function checkAllTriggers() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT 
       OBJECT_NAME(parent_id) as ParentTable,
       name as TriggerName,
       OBJECT_DEFINITION(object_id) as TriggerDefinition
      FROM sys.triggers
      WHERE OBJECT_DEFINITION(object_id) LIKE '%ACCOUNTS%'
    `);
    console.table(result.recordset);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkAllTriggers();
