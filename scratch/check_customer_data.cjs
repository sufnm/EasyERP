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
        AI.ACC_NO, 
        ISNULL(AI.ACC_NAME, A.ACC_NAME) as ACC_NAME, 
        AI.ACC_TYPE
      FROM dbo.ACCOUNTS_INFO AI
      LEFT JOIN dbo.ACCOUNTS A ON AI.ACC_NO = A.ACC_NO
      WHERE AI.ACC_TYPE = 1
    `);
    console.log('List API would return:', res.recordset);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.close();
  }
}

run();
