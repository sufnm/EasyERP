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
        p.name AS ParameterName,
        t.name AS ParameterType,
        p.max_length AS MaxLength,
        p.is_output AS IsOutput
      FROM sys.parameters p
      INNER JOIN sys.types t ON p.user_type_id = t.user_type_id
      WHERE p.object_id = OBJECT_ID('dbo.SP_TRN_ENTRY_EXPSAVE')
      ORDER BY p.parameter_id
    `);
    console.table(res.recordset);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.close();
  }
}

run();
