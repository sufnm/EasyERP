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

async function checkTriggersAnywhere() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT 
          t.name AS TriggerName,
          OBJECT_NAME(t.parent_id) AS ParentName,
          t.type_desc,
          OBJECT_DEFINITION(t.object_id) AS Definition
      FROM sys.triggers t
      WHERE OBJECT_DEFINITION(t.object_id) LIKE '%TRN_ACCOUNTS%'
    `);
    console.table(result.recordset.map(r => ({ Name: r.TriggerName, Parent: r.ParentName })));
    result.recordset.forEach(r => {
        console.log(`--- TRIGGER: ${r.TriggerName} on ${r.ParentName} ---`);
        console.log(r.Definition);
    });
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkTriggersAnywhere();
