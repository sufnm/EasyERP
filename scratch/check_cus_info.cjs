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
    const res = await sql.query("SELECT TOP 1 * FROM dbo.CUS_MORE_INFO");
    if (res.recordset.length > 0) {
      console.log('Columns:', Object.keys(res.recordset[0]));
    } else {
      console.log('Table exists but is empty.');
      const cols = await sql.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CUS_MORE_INFO'");
      console.log('Columns:', cols.recordset.map(c => c.COLUMN_NAME));
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.close();
  }
}

run();
