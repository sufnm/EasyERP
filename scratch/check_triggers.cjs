const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'sa0101',
  server: process.env.DB_SERVER || 'cloudsrv.dyndns.org',
  database: process.env.DB_NAME || 'Eazysoftdb',
  options: {
    trustServerCertificate: true,
    encrypt: false
  }
};

async function run() {
  try {
    await sql.connect(config);
    const res = await sql.query(`
      SELECT 
        t.name AS TriggerName,
        OBJECT_DEFINITION(t.object_id) AS TriggerDefinition
      FROM sys.triggers t
      INNER JOIN sys.tables tb ON t.parent_id = tb.object_id
      WHERE tb.name = 'UserInfo'
    `);
    console.log(JSON.stringify(res.recordset, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.close();
  }
}

run();
