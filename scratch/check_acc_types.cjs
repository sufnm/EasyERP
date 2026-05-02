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
    const res = await sql.query("SELECT DISTINCT ACC_TYPE FROM dbo.ACCOUNTS_INFO");
    console.log('Account Types:', res.recordset);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.close();
  }
}

run();
