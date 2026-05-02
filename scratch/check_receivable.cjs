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
    const res = await sql.query("SELECT ACC_NO, ACC_NAME, ACC_LEVEL FROM dbo.ACCOUNTS WHERE ACC_NO = 1150100");
    console.log('Result:', res.recordset);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.close();
  }
}

run();
