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
        o.name AS ObjectName,
        o.type_desc AS ObjectType,
        m.definition AS ObjectDefinition
      FROM sys.sql_modules m
      INNER JOIN sys.objects o ON m.object_id = o.object_id
      WHERE m.definition LIKE '%uid%'
    `);
    console.log(`Found ${res.recordset.length} database objects containing 'uid':`);
    res.recordset.forEach(row => {
      console.log(`- [${row.ObjectType}] ${row.ObjectName}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.close();
  }
}

run();
