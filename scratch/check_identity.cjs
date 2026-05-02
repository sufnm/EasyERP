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
    const res = await sql.query("SELECT COLUMNPROPERTY(OBJECT_ID('dbo.ACCOUNTS_INFO'), 'ACC_ID', 'IsIdentity') as IsIdentity");
    console.log('IsIdentity:', res.recordset[0].IsIdentity);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.close();
  }
}

run();
